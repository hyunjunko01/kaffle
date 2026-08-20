// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {Kaffle} from "../../src/Kaffle.sol";
import {KaffleFactory} from "../../src/KaffleFactory.sol";
import {KaffleVault} from "../../src/KaffleVault.sol";
import {IKaffle} from "../../src/interfaces/IKaffle.sol";
import {IKaffleFactory} from "../../src/interfaces/IKaffleFactory.sol";
import {IKaffleVault} from "../../src/interfaces/IKaffleVault.sol";
import {SigUtils} from "../helpers/SigUtils.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {MockVRFCoordinator} from "../mock/MockVRFCoordinator.sol";

contract RaffleLifecycleTest is SigUtils {
    Kaffle internal implementation;
    KaffleFactory internal factory;
    KaffleVault internal vault;
    MockERC20 internal token;
    MockVRFCoordinator internal coordinator;

    address internal owner;
    address internal relayer;
    address internal userA;
    address internal userB;
    uint256 internal signerPk;
    address internal signer;

    uint256 internal constant PRIZE = 1_000e18;
    uint64 internal constant DURATION = 3 days;

    function setUp() public {
        owner = makeAddr("owner");
        relayer = makeAddr("relayer");
        userA = makeAddr("userA");
        userB = makeAddr("userB");
        (signer, signerPk) = makeAddrAndKey("signer");

        token = new MockERC20();
        vault = new KaffleVault(address(token), owner);
        implementation = new Kaffle();
        coordinator = new MockVRFCoordinator();

        KaffleFactory.VRFConfig memory vrfConfig = KaffleFactory.VRFConfig({
            keyHash: bytes32(uint256(1)),
            subscriptionId: 1,
            requestConfirmations: 3,
            callbackGasLimit: 500_000,
            nativePayment: false
        });

        factory =
            new KaffleFactory(owner, address(implementation), address(vault), address(coordinator), signer, vrfConfig);

        vm.prank(owner);
        vault.setFactory(address(factory));
        token.mint(address(vault), 10_000e18);
    }

    function _createRaffle(uint256 prize) internal returns (Kaffle raffle) {
        vm.prank(owner);
        raffle = Kaffle(factory.createRaffle(DURATION, prize));
    }

    function _enter(Kaffle raffle, address user, uint256 tickets) internal {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = raffle.nonce(user);
        bytes memory signature = _signEnter(signerPk, address(raffle), user, tickets, nonce, deadline);
        vm.prank(relayer);
        raffle.enter(user, tickets, deadline, signature);
    }

    function _settle(Kaffle raffle, uint256 randomWord) internal {
        vm.warp(raffle.endTime());
        raffle.requestWinner();
        coordinator.fulfill(address(factory), 1, randomWord);
    }

    function test_fullFlow_enterSettleAndClaim() public {
        Kaffle raffle = _createRaffle(PRIZE);

        assertEq(factory.currentRaffle(), address(raffle));
        assertTrue(factory.isRaffle(address(raffle)));
        assertEq(raffle.factory(), address(factory));
        assertEq(raffle.vault(), address(vault));
        assertEq(vault.reserved(), PRIZE);

        _enter(raffle, userA, 10);
        _enter(raffle, userB, 30);

        assertEq(raffle.totalTickets(), 40);
        assertEq(raffle.entryCount(), 2);

        _settle(raffle, 10);
        assertEq(raffle.winner(), userB);
        assertTrue(raffle.isFinished());

        vm.prank(relayer);
        vault.claim(address(raffle));

        assertEq(token.balanceOf(userB), PRIZE);
        assertEq(vault.reserved(), 0);
        (, bool claimed,) = vault.prizeOf(address(raffle));
        assertTrue(claimed);
    }

    function test_relayerCanEnterOnBehalfOfUsers() public {
        Kaffle raffle = _createRaffle(PRIZE);
        _enter(raffle, userA, 7);

        (address storedUser, uint256 cumulative) = raffle.entryAt(0);
        assertEq(storedUser, userA);
        assertEq(cumulative, 7);
        assertEq(raffle.nonce(userA), 1);
    }

    function test_cannotCreateNextRaffleWhileEntriesAreUnsettled() public {
        Kaffle raffle = _createRaffle(PRIZE);
        _enter(raffle, userA, 1);
        vm.warp(raffle.endTime());

        vm.prank(owner);
        vm.expectRevert(IKaffleFactory.RaffleActive.selector);
        factory.createRaffle(DURATION, PRIZE);
    }

    function test_emptyRoundReleasesPrizeForNextRaffle() public {
        Kaffle first = _createRaffle(PRIZE);
        vm.warp(first.endTime());
        assertTrue(first.isFinished());

        vm.expectRevert(IKaffle.NoEntries.selector);
        first.requestWinner();

        Kaffle second = _createRaffle(2_000e18);
        assertEq(factory.currentRaffle(), address(second));
        assertEq(vault.reserved(), 2_000e18);

        (uint256 firstAmount,, bool firstAttached) = vault.prizeOf(address(first));
        assertEq(firstAmount, 0);
        assertFalse(firstAttached);
    }

    function test_nextRaffleAfterClaimDoesNotReleasePrize() public {
        Kaffle first = _createRaffle(PRIZE);
        _enter(first, userA, 1);
        _settle(first, 0);
        vault.claim(address(first));

        uint256 reservedBefore = vault.reserved();
        Kaffle second = _createRaffle(500e18);

        assertEq(factory.currentRaffle(), address(second));
        assertEq(vault.reserved(), reservedBefore + 500e18);
        (, bool claimed,) = vault.prizeOf(address(first));
        assertTrue(claimed);
        assertEq(token.balanceOf(userA), PRIZE);
    }

    function test_signatureFromOldRoundCannotEnterNewRound() public {
        Kaffle first = _createRaffle(PRIZE);
        uint256 deadline = block.timestamp + 30 days;
        bytes memory signature = _signEnter(signerPk, address(first), userA, 1, 0, deadline);

        _enter(first, userA, 1);
        _settle(first, 0);

        Kaffle second = _createRaffle(PRIZE);
        vm.expectRevert(IKaffle.InvalidSignature.selector);
        second.enter(userA, 1, deadline, signature);
    }

    function test_factoryForwardsVrfFulfillmentToClone() public {
        Kaffle raffle = _createRaffle(PRIZE);
        _enter(raffle, userA, 4);
        _enter(raffle, userB, 6);

        vm.warp(raffle.endTime());
        vm.prank(relayer);
        raffle.requestWinner();

        coordinator.fulfill(address(factory), 1, 4);
        assertEq(raffle.winner(), userB);
    }

    function test_claimSendsTokensToWinnerEvenIfCallerIsNotWinner() public {
        Kaffle raffle = _createRaffle(PRIZE);
        _enter(raffle, userA, 1);
        _settle(raffle, 0);

        vm.prank(userB);
        vault.claim(address(raffle));
        assertEq(token.balanceOf(userA), PRIZE);
        assertEq(token.balanceOf(userB), 0);
    }

    function test_createRaffle_revertsWhenVaultCannotCoverPrize() public {
        uint256 balance = token.balanceOf(address(vault));
        vm.prank(owner);
        vault.withdrawUnallocated(owner, balance);

        vm.prank(owner);
        vm.expectRevert(IKaffleVault.InsufficientFunds.selector);
        factory.createRaffle(DURATION, PRIZE);
    }

    function test_onlyOwnerCanCreateRaffle() public {
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, relayer));
        factory.createRaffle(DURATION, PRIZE);
    }
}
