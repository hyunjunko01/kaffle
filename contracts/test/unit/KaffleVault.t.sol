// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Test} from "forge-std/Test.sol";

import {KaffleVault} from "../../src/KaffleVault.sol";
import {IKaffleVault} from "../../src/interfaces/IKaffleVault.sol";
import {MockERC20} from "../mock/MockERC20.sol";
import {MockKaffle} from "../mock/MockKaffle.sol";

contract KaffleVaultTest is Test {
    KaffleVault internal vault;
    MockERC20 internal token;
    MockKaffle internal raffle;

    address internal owner;
    address internal factory;
    address internal attacker;
    address internal winner;

    uint256 internal constant PRIZE = 1_000e18;

    function setUp() public {
        owner = makeAddr("owner");
        factory = makeAddr("factory");
        attacker = makeAddr("attacker");
        winner = makeAddr("winner");

        token = new MockERC20();
        vault = new KaffleVault(address(token), owner);
        raffle = new MockKaffle();

        vm.prank(owner);
        vault.setFactory(factory);

        token.mint(address(vault), 10_000e18);
    }

    function _attach() internal {
        vm.prank(factory);
        vault.attachPrize(address(raffle), PRIZE);
    }

    function test_constructor_setsTokenAndOwner() public view {
        assertEq(vault.token(), address(token));
        assertEq(vault.owner(), owner);
        assertEq(vault.factory(), factory);
        assertEq(vault.reserved(), 0);
        assertEq(vault.unallocated(), 10_000e18);
    }

    function test_constructor_revertsWhenTokenZero() public {
        vm.expectRevert(IKaffleVault.ZeroAddress.selector);
        new KaffleVault(address(0), owner);
    }

    function test_setFactory_revertsWhenAlreadySet() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleVault.AlreadySet.selector);
        vault.setFactory(makeAddr("other"));
    }

    function test_setFactory_revertsWhenZero() public {
        KaffleVault fresh = new KaffleVault(address(token), owner);
        vm.prank(owner);
        vm.expectRevert(IKaffleVault.ZeroAddress.selector);
        fresh.setFactory(address(0));
    }

    function test_setFactory_revertsWhenNotOwner() public {
        KaffleVault fresh = new KaffleVault(address(token), owner);
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        fresh.setFactory(factory);
    }

    function test_attachPrize_reservesAmount() public {
        vm.prank(factory);
        vm.expectEmit(true, true, true, true, address(vault));
        emit IKaffleVault.PrizeAttached(address(raffle), PRIZE);
        vault.attachPrize(address(raffle), PRIZE);

        (uint256 amount, bool claimed, bool attached) = vault.prizeOf(address(raffle));
        assertEq(amount, PRIZE);
        assertFalse(claimed);
        assertTrue(attached);
        assertEq(vault.reserved(), PRIZE);
        assertEq(vault.unallocated(), 10_000e18 - PRIZE);
    }

    function test_attachPrize_revertsWhenNotFactory() public {
        vm.prank(attacker);
        vm.expectRevert(IKaffleVault.OnlyFactory.selector);
        vault.attachPrize(address(raffle), PRIZE);
    }

    function test_attachPrize_revertsWhenRaffleZero() public {
        vm.prank(factory);
        vm.expectRevert(IKaffleVault.ZeroAddress.selector);
        vault.attachPrize(address(0), PRIZE);
    }

    function test_attachPrize_revertsWhenAmountZero() public {
        vm.prank(factory);
        vm.expectRevert(IKaffleVault.ZeroAmount.selector);
        vault.attachPrize(address(raffle), 0);
    }

    function test_attachPrize_revertsWhenAlreadyAttached() public {
        _attach();
        vm.prank(factory);
        vm.expectRevert(IKaffleVault.AlreadyAttached.selector);
        vault.attachPrize(address(raffle), PRIZE);
    }

    function test_attachPrize_revertsWhenInsufficientFunds() public {
        vm.prank(factory);
        vm.expectRevert(IKaffleVault.InsufficientFunds.selector);
        vault.attachPrize(address(raffle), 10_000e18 + 1);
    }

    function test_releaseUnwon_returnsReservedWhenFinishedWithoutWinner() public {
        _attach();
        raffle.setFinished(true);

        vm.prank(factory);
        vm.expectEmit(true, true, true, true, address(vault));
        emit IKaffleVault.PrizeReleased(address(raffle), PRIZE);
        vault.releaseUnwon(address(raffle));

        (uint256 amount, bool claimed, bool attached) = vault.prizeOf(address(raffle));
        assertEq(amount, 0);
        assertFalse(claimed);
        assertFalse(attached);
        assertEq(vault.reserved(), 0);
        assertEq(vault.unallocated(), 10_000e18);
    }

    function test_releaseUnwon_revertsWhenNotFactory() public {
        _attach();
        vm.prank(attacker);
        vm.expectRevert(IKaffleVault.OnlyFactory.selector);
        vault.releaseUnwon(address(raffle));
    }

    function test_releaseUnwon_isNoopWhenNotAttached() public {
        vm.prank(factory);
        vault.releaseUnwon(address(raffle));
        assertEq(vault.reserved(), 0);
    }

    function test_releaseUnwon_isNoopWhenAlreadyClaimed() public {
        _attach();
        raffle.setWinner(winner);
        vault.claim(address(raffle));

        uint256 reservedAfterClaim = vault.reserved();
        vm.prank(factory);
        vault.releaseUnwon(address(raffle));
        assertEq(vault.reserved(), reservedAfterClaim);
    }

    function test_releaseUnwon_isNoopWhenWinnerExists() public {
        _attach();
        raffle.setFinished(true);
        raffle.setWinner(winner);

        vm.prank(factory);
        vault.releaseUnwon(address(raffle));
        assertEq(vault.reserved(), PRIZE);
    }

    function test_releaseUnwon_isNoopWhenRoundNotFinished() public {
        _attach();
        vm.prank(factory);
        vault.releaseUnwon(address(raffle));
        assertEq(vault.reserved(), PRIZE);
    }

    function test_claim_paysWinnerAndMarksClaimed() public {
        _attach();
        raffle.setWinner(winner);

        vm.prank(attacker);
        vm.expectEmit(true, true, true, true, address(vault));
        emit IKaffleVault.Claimed(address(raffle), winner, PRIZE);
        vault.claim(address(raffle));

        (, bool claimed, bool attached) = vault.prizeOf(address(raffle));
        assertTrue(claimed);
        assertTrue(attached);
        assertEq(vault.reserved(), 0);
        assertEq(token.balanceOf(winner), PRIZE);
        assertEq(token.balanceOf(address(vault)), 9_000e18);
    }

    function test_claim_revertsWhenPrizeNotAttached() public {
        vm.expectRevert(IKaffleVault.PrizeNotAttached.selector);
        vault.claim(address(raffle));
    }

    function test_claim_revertsWhenAlreadyClaimed() public {
        _attach();
        raffle.setWinner(winner);
        vault.claim(address(raffle));
        vm.expectRevert(IKaffleVault.AlreadyClaimed.selector);
        vault.claim(address(raffle));
    }

    function test_claim_revertsWhenNoWinner() public {
        _attach();
        vm.expectRevert(IKaffleVault.NoWinner.selector);
        vault.claim(address(raffle));
    }

    function test_withdrawUnallocated_sendsIdleTokens() public {
        _attach();
        address to = makeAddr("treasury");

        vm.prank(owner);
        vault.withdrawUnallocated(to, 500e18);

        assertEq(token.balanceOf(to), 500e18);
        assertEq(vault.reserved(), PRIZE);
        assertEq(vault.unallocated(), 10_000e18 - PRIZE - 500e18);
    }

    function test_withdrawUnallocated_revertsWhenToZero() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleVault.ZeroAddress.selector);
        vault.withdrawUnallocated(address(0), 1);
    }

    function test_withdrawUnallocated_revertsWhenAmountTooHigh() public {
        _attach();
        uint256 amount = vault.unallocated() + 1;
        vm.prank(owner);
        vm.expectRevert(IKaffleVault.InsufficientUnallocated.selector);
        vault.withdrawUnallocated(owner, amount);
    }

    function test_withdrawUnallocated_revertsWhenNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        vault.withdrawUnallocated(attacker, 1);
    }

    function test_unallocated_returnsZeroWhenBalanceBelowReserved() public {
        _attach();
        deal(address(token), address(vault), 0);
        assertEq(vault.unallocated(), 0);
    }
}
