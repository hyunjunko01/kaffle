// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {stdError} from "forge-std/StdError.sol";
import {Test} from "forge-std/Test.sol";

import {KaffleFactory} from "../../src/KaffleFactory.sol";
import {IKaffleFactory} from "../../src/interfaces/IKaffleFactory.sol";
import {MockKaffle} from "../mock/MockKaffle.sol";
import {MockKaffleVault} from "../mock/MockKaffleVault.sol";
import {MockVRFCoordinator} from "../mock/MockVRFCoordinator.sol";

contract KaffleFactoryTest is Test {
    KaffleFactory internal factory;
    MockKaffle internal implementation;
    MockKaffleVault internal vault;
    MockVRFCoordinator internal coordinator;

    address internal owner;
    address internal attacker;
    address internal signer;

    KaffleFactory.VRFConfig internal vrfConfig;

    function setUp() public {
        owner = makeAddr("owner");
        attacker = makeAddr("attacker");
        signer = makeAddr("signer");

        implementation = new MockKaffle();
        vault = new MockKaffleVault();
        coordinator = new MockVRFCoordinator();

        vrfConfig = KaffleFactory.VRFConfig({
            keyHash: bytes32(uint256(1)),
            subscriptionId: 7,
            requestConfirmations: 3,
            callbackGasLimit: 500_000,
            nativePayment: false
        });

        factory =
            new KaffleFactory(owner, address(implementation), address(vault), address(coordinator), signer, vrfConfig);
    }

    function test_constructor_setsImmutablesAndConfig() public view {
        assertEq(factory.owner(), owner);
        assertEq(factory.implementation(), address(implementation));
        assertEq(factory.vault(), address(vault));
        assertEq(factory.vrfCoordinator(), address(coordinator));
        assertEq(factory.ticketSigner(), signer);
        assertEq(factory.currentRaffle(), address(0));

        (
            bytes32 keyHash,
            uint256 subscriptionId,
            uint16 requestConfirmations,
            uint32 callbackGasLimit,
            bool nativePayment
        ) = factory.vrfConfig();
        assertEq(keyHash, vrfConfig.keyHash);
        assertEq(subscriptionId, vrfConfig.subscriptionId);
        assertEq(requestConfirmations, vrfConfig.requestConfirmations);
        assertEq(callbackGasLimit, vrfConfig.callbackGasLimit);
        assertEq(nativePayment, vrfConfig.nativePayment);
    }

    function test_constructor_revertsWhenImplementationZero() public {
        vm.expectRevert(IKaffleFactory.ZeroAddress.selector);
        new KaffleFactory(owner, address(0), address(vault), address(coordinator), signer, vrfConfig);
    }

    function test_constructor_revertsWhenVaultZero() public {
        vm.expectRevert(IKaffleFactory.ZeroAddress.selector);
        new KaffleFactory(owner, address(implementation), address(0), address(coordinator), signer, vrfConfig);
    }

    function test_constructor_revertsWhenCoordinatorZero() public {
        vm.expectRevert(IKaffleFactory.ZeroAddress.selector);
        new KaffleFactory(owner, address(implementation), address(vault), address(0), signer, vrfConfig);
    }

    function test_constructor_revertsWhenSignerZero() public {
        vm.expectRevert(IKaffleFactory.ZeroAddress.selector);
        new KaffleFactory(owner, address(implementation), address(vault), address(coordinator), address(0), vrfConfig);
    }

    function test_createRaffle_clonesInitializesAndAttachesPrize() public {
        uint64 duration = 3 days;
        uint256 prize = 1_000e18;

        vm.prank(owner);
        address raffle = factory.createRaffle(duration, prize);

        assertTrue(factory.isRaffle(raffle));
        assertEq(factory.currentRaffle(), raffle);

        MockKaffle clone = MockKaffle(raffle);
        assertEq(clone.factory(), address(factory));
        assertEq(clone.vault(), address(vault));
        assertEq(clone.startTime(), uint64(block.timestamp));
        assertEq(clone.endTime(), uint64(block.timestamp) + duration);

        assertEq(vault.lastAttachedRaffle(), raffle);
        assertEq(vault.lastAttachedAmount(), prize);
        assertEq(vault.attachCount(), 1);
    }

    function test_createRaffle_revertsWhenNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        factory.createRaffle(1 days, 1);
    }

    function test_createRaffle_revertsWhenDurationZero() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleFactory.InvalidDuration.selector);
        factory.createRaffle(0, 1);
    }

    function test_createRaffle_revertsWhenPrizeZero() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleFactory.InvalidPrize.selector);
        factory.createRaffle(1 days, 0);
    }

    function test_createRaffle_revertsWhenDurationOverflows() public {
        vm.warp(100);
        vm.prank(owner);
        vm.expectRevert(stdError.arithmeticError);
        factory.createRaffle(type(uint64).max, 1);
    }

    function test_createRaffle_revertsWhileCurrentRoundActive() public {
        vm.prank(owner);
        factory.createRaffle(1 days, 100);

        vm.prank(owner);
        vm.expectRevert(IKaffleFactory.RaffleActive.selector);
        factory.createRaffle(1 days, 100);
    }

    function test_createRaffle_releasesUnwonWhenPreviousRoundFinishedWithoutWinner() public {
        vm.prank(owner);
        address first = factory.createRaffle(1 days, 100);
        MockKaffle(first).setFinished(true);

        vm.prank(owner);
        address second = factory.createRaffle(1 days, 200);

        assertEq(vault.releaseCount(), 1);
        assertEq(vault.lastReleasedRaffle(), first);
        assertEq(factory.currentRaffle(), second);
        assertEq(vault.lastAttachedRaffle(), second);
        assertEq(vault.lastAttachedAmount(), 200);
    }

    function test_createRaffle_doesNotReleaseWhenPreviousRoundHasWinner() public {
        vm.prank(owner);
        address first = factory.createRaffle(1 days, 100);
        MockKaffle(first).setFinished(true);
        MockKaffle(first).setWinner(makeAddr("winner"));

        vm.prank(owner);
        factory.createRaffle(1 days, 200);

        assertEq(vault.releaseCount(), 0);
    }

    function test_requestRandomness_revertsWhenCallerNotRaffle() public {
        vm.expectRevert(IKaffleFactory.NotRaffle.selector);
        factory.requestRandomness();
    }

    function test_requestRandomness_recordsRequestFromClone() public {
        vm.prank(owner);
        address raffle = factory.createRaffle(1 days, 100);

        vm.prank(raffle);
        uint256 requestId = factory.requestRandomness();

        assertEq(requestId, 1);
        assertEq(coordinator.lastConsumer(), address(factory));
        assertEq(coordinator.lastNumWords(), 1);
        assertEq(coordinator.lastSubId(), vrfConfig.subscriptionId);
    }

    function test_rawFulfillRandomWords_settlesMatchingRaffle() public {
        vm.prank(owner);
        address raffle = factory.createRaffle(1 days, 100);
        MockKaffle(raffle).setTotalTickets(10);

        vm.prank(raffle);
        uint256 requestId = factory.requestRandomness();

        coordinator.fulfill(address(factory), requestId, 123);
        assertEq(MockKaffle(raffle).lastRandomWord(), 123);
    }

    function test_rawFulfillRandomWords_revertsWhenNotCoordinator() public {
        vm.expectRevert(IKaffleFactory.OnlyCoordinator.selector);
        factory.rawFulfillRandomWords(1, _oneWord(1));
    }

    function test_rawFulfillRandomWords_revertsWhenUnknownRequest() public {
        vm.prank(address(coordinator));
        vm.expectRevert(IKaffleFactory.UnknownRequest.selector);
        factory.rawFulfillRandomWords(99, _oneWord(1));
    }

    function test_rawFulfillRandomWords_cannotReuseRequestId() public {
        vm.prank(owner);
        address raffle = factory.createRaffle(1 days, 100);
        MockKaffle(raffle).setTotalTickets(10);

        vm.prank(raffle);
        uint256 requestId = factory.requestRandomness();
        coordinator.fulfill(address(factory), requestId, 1);

        vm.prank(address(coordinator));
        vm.expectRevert(IKaffleFactory.UnknownRequest.selector);
        factory.rawFulfillRandomWords(requestId, _oneWord(2));
    }

    function test_setTicketSigner_updatesSigner() public {
        address nextSigner = makeAddr("nextSigner");
        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(factory));
        emit IKaffleFactory.TicketSignerUpdated(nextSigner);
        factory.setTicketSigner(nextSigner);
        assertEq(factory.ticketSigner(), nextSigner);
    }

    function test_setTicketSigner_revertsWhenZero() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleFactory.ZeroAddress.selector);
        factory.setTicketSigner(address(0));
    }

    function test_setTicketSigner_revertsWhenNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        factory.setTicketSigner(makeAddr("next"));
    }

    function test_setVRFCoordinator_updatesCoordinator() public {
        address next = makeAddr("nextCoordinator");
        vm.prank(owner);
        factory.setVRFCoordinator(next);
        assertEq(factory.vrfCoordinator(), next);
    }

    function test_setVRFCoordinator_revertsWhenZero() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleFactory.ZeroAddress.selector);
        factory.setVRFCoordinator(address(0));
    }

    function test_setVRFConfig_updatesConfig() public {
        KaffleFactory.VRFConfig memory next = KaffleFactory.VRFConfig({
            keyHash: bytes32(uint256(9)),
            subscriptionId: 42,
            requestConfirmations: 8,
            callbackGasLimit: 200_000,
            nativePayment: true
        });

        vm.prank(owner);
        factory.setVRFConfig(next);

        (bytes32 keyHash, uint256 subscriptionId, uint16 confirmations, uint32 gasLimit, bool nativePayment) =
            factory.vrfConfig();
        assertEq(keyHash, next.keyHash);
        assertEq(subscriptionId, next.subscriptionId);
        assertEq(confirmations, next.requestConfirmations);
        assertEq(gasLimit, next.callbackGasLimit);
        assertTrue(nativePayment);
    }

    function _oneWord(uint256 word) private pure returns (uint256[] memory words) {
        words = new uint256[](1);
        words[0] = word;
    }
}
