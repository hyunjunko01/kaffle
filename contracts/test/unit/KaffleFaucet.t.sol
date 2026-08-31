// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {KaffleFaucet} from "../../src/KaffleFaucet.sol";
import {IKaffleFaucet} from "../../src/interfaces/IKaffleFaucet.sol";
import {SigUtils} from "../helpers/SigUtils.sol";
import {MockERC20} from "../mock/MockERC20.sol";

contract KaffleFaucetTest is SigUtils {
    KaffleFaucet internal faucet;
    MockERC20 internal token;

    address internal owner;
    address internal user;
    address internal relayer;
    address internal attacker;
    uint256 internal signerPk;
    address internal signer;

    uint256 internal constant CLAIM_AMOUNT = 0.001e18;

    function setUp() public {
        owner = makeAddr("owner");
        user = makeAddr("user");
        relayer = makeAddr("relayer");
        attacker = makeAddr("attacker");
        (signer, signerPk) = makeAddrAndKey("signer");

        token = new MockERC20();
        faucet = new KaffleFaucet(address(token), owner, signer, CLAIM_AMOUNT);
        token.mint(address(faucet), 10 * CLAIM_AMOUNT);
    }

    function _deadline() internal view returns (uint256) {
        return block.timestamp + 1 hours;
    }

    function _claimAs(address caller, address who, uint256 deadline) internal {
        bytes memory signature = _signClaim(signerPk, address(faucet), who, CLAIM_AMOUNT, deadline);
        vm.prank(caller);
        faucet.claim(who, deadline, signature);
    }

    function test_constructor_setsState() public view {
        assertEq(faucet.token(), address(token));
        assertEq(faucet.owner(), owner);
        assertEq(faucet.signer(), signer);
        assertEq(faucet.claimAmount(), CLAIM_AMOUNT);
        assertFalse(faucet.paused());
        assertFalse(faucet.claimed(user));
        assertEq(faucet.DOMAIN_SEPARATOR(), _faucetDomainSeparator(address(faucet)));
    }

    function test_constructor_revertsWhenTokenZero() public {
        vm.expectRevert(IKaffleFaucet.ZeroAddress.selector);
        new KaffleFaucet(address(0), owner, signer, CLAIM_AMOUNT);
    }

    function test_constructor_revertsWhenSignerZero() public {
        vm.expectRevert(IKaffleFaucet.ZeroAddress.selector);
        new KaffleFaucet(address(token), owner, address(0), CLAIM_AMOUNT);
    }

    function test_constructor_revertsWhenAmountZero() public {
        vm.expectRevert(IKaffleFaucet.ZeroAmount.selector);
        new KaffleFaucet(address(token), owner, signer, 0);
    }

    function test_claim_paysUserNotCallerAndMarksClaimed() public {
        uint256 deadline = _deadline();

        vm.expectEmit(true, true, true, true, address(faucet));
        emit IKaffleFaucet.Claimed(user, CLAIM_AMOUNT);
        _claimAs(relayer, user, deadline);

        assertTrue(faucet.claimed(user));
        assertEq(token.balanceOf(user), CLAIM_AMOUNT);
        assertEq(token.balanceOf(relayer), 0);
        assertEq(token.balanceOf(address(faucet)), 9 * CLAIM_AMOUNT);
    }

    function test_claim_allowsAnyoneToSubmit() public {
        _claimAs(attacker, user, _deadline());
        assertEq(token.balanceOf(user), CLAIM_AMOUNT);
        assertEq(token.balanceOf(attacker), 0);
    }

    function test_claim_allowsSecondUser() public {
        address userB = makeAddr("userB");
        uint256 deadline = _deadline();

        _claimAs(relayer, user, deadline);
        _claimAs(relayer, userB, deadline);

        assertTrue(faucet.claimed(user));
        assertTrue(faucet.claimed(userB));
        assertEq(token.balanceOf(user), CLAIM_AMOUNT);
        assertEq(token.balanceOf(userB), CLAIM_AMOUNT);
    }

    function test_claim_sameSignatureRetriesAfterFailureThenSucceedsOnce() public {
        uint256 deadline = _deadline();
        bytes memory signature = _signClaim(signerPk, address(faucet), user, CLAIM_AMOUNT, deadline);

        deal(address(token), address(faucet), 0);
        vm.prank(relayer);
        vm.expectRevert(IKaffleFaucet.InsufficientFunds.selector);
        faucet.claim(user, deadline, signature);

        token.mint(address(faucet), CLAIM_AMOUNT);
        vm.prank(relayer);
        faucet.claim(user, deadline, signature);
        assertEq(token.balanceOf(user), CLAIM_AMOUNT);

        vm.prank(relayer);
        vm.expectRevert(IKaffleFaucet.AlreadyClaimed.selector);
        faucet.claim(user, deadline, signature);
    }

    function test_claim_revertsWhenAlreadyClaimed() public {
        uint256 deadline = _deadline();
        _claimAs(relayer, user, deadline);

        vm.expectRevert(IKaffleFaucet.AlreadyClaimed.selector);
        _claimAs(relayer, user, deadline);
    }

    function test_claim_revertsWhenUserZero() public {
        uint256 deadline = _deadline();
        bytes memory signature = _signClaim(signerPk, address(faucet), address(0), CLAIM_AMOUNT, deadline);
        vm.expectRevert(IKaffleFaucet.ZeroAddress.selector);
        faucet.claim(address(0), deadline, signature);
    }

    function test_claim_revertsWhenExpired() public {
        uint256 deadline = block.timestamp;
        bytes memory signature = _signClaim(signerPk, address(faucet), user, CLAIM_AMOUNT, deadline);
        vm.warp(deadline + 1);
        vm.expectRevert(IKaffleFaucet.SignatureExpired.selector);
        faucet.claim(user, deadline, signature);
    }

    function test_claim_revertsWhenWrongSigner() public {
        uint256 otherPk;
        (, otherPk) = makeAddrAndKey("other");
        uint256 deadline = _deadline();
        bytes memory signature = _signClaim(otherPk, address(faucet), user, CLAIM_AMOUNT, deadline);

        vm.expectRevert(IKaffleFaucet.InvalidSignature.selector);
        faucet.claim(user, deadline, signature);
    }

    function test_claim_revertsWhenCallerChangesUser() public {
        uint256 deadline = _deadline();
        bytes memory signature = _signClaim(signerPk, address(faucet), user, CLAIM_AMOUNT, deadline);

        vm.expectRevert(IKaffleFaucet.InvalidSignature.selector);
        faucet.claim(attacker, deadline, signature);
    }

    function test_claim_revertsWhenAmountInSignatureDiffers() public {
        uint256 deadline = _deadline();
        bytes memory signature = _signClaim(signerPk, address(faucet), user, CLAIM_AMOUNT + 1, deadline);

        vm.expectRevert(IKaffleFaucet.InvalidSignature.selector);
        faucet.claim(user, deadline, signature);
    }

    function test_claim_revertsWhenPaused() public {
        vm.prank(owner);
        faucet.pause();

        vm.expectRevert(IKaffleFaucet.Paused.selector);
        _claimAs(relayer, user, _deadline());
    }

    function test_claim_worksAfterUnpause() public {
        vm.prank(owner);
        faucet.pause();
        vm.prank(owner);
        faucet.unpause();

        _claimAs(relayer, user, _deadline());
        assertEq(token.balanceOf(user), CLAIM_AMOUNT);
    }

    function test_pause_revertsWhenNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        faucet.pause();
    }

    function test_unpause_emitsAndClearsFlag() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(faucet));
        emit IKaffleFaucet.PausedSet(true);
        faucet.pause();
        assertTrue(faucet.paused());

        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(faucet));
        emit IKaffleFaucet.PausedSet(false);
        faucet.unpause();
        assertFalse(faucet.paused());
    }

    function test_setSigner_acceptsNewSignaturesOnly() public {
        (address nextSigner, uint256 nextPk) = makeAddrAndKey("nextSigner");
        uint256 deadline = _deadline();

        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(faucet));
        emit IKaffleFaucet.SignerUpdated(nextSigner);
        faucet.setSigner(nextSigner);
        assertEq(faucet.signer(), nextSigner);

        bytes memory oldSig = _signClaim(signerPk, address(faucet), user, CLAIM_AMOUNT, deadline);
        vm.expectRevert(IKaffleFaucet.InvalidSignature.selector);
        faucet.claim(user, deadline, oldSig);

        bytes memory newSig = _signClaim(nextPk, address(faucet), user, CLAIM_AMOUNT, deadline);
        faucet.claim(user, deadline, newSig);
        assertEq(token.balanceOf(user), CLAIM_AMOUNT);
    }

    function test_setSigner_revertsWhenZero() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleFaucet.ZeroAddress.selector);
        faucet.setSigner(address(0));
    }

    function test_setSigner_revertsWhenNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        faucet.setSigner(attacker);
    }

    function test_withdraw_sendsTokens() public {
        address to = makeAddr("treasury");

        vm.prank(owner);
        vm.expectEmit(true, true, true, true, address(faucet));
        emit IKaffleFaucet.Withdrawn(to, CLAIM_AMOUNT);
        faucet.withdraw(to, CLAIM_AMOUNT);

        assertEq(token.balanceOf(to), CLAIM_AMOUNT);
        assertEq(token.balanceOf(address(faucet)), 9 * CLAIM_AMOUNT);
    }

    function test_withdraw_revertsWhenToZero() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleFaucet.ZeroAddress.selector);
        faucet.withdraw(address(0), CLAIM_AMOUNT);
    }

    function test_withdraw_revertsWhenAmountZero() public {
        vm.prank(owner);
        vm.expectRevert(IKaffleFaucet.ZeroAmount.selector);
        faucet.withdraw(owner, 0);
    }

    function test_withdraw_revertsWhenAmountTooHigh() public {
        uint256 balance = token.balanceOf(address(faucet));
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, address(faucet), balance, balance + 1)
        );
        faucet.withdraw(owner, balance + 1);
    }

    function test_withdraw_revertsWhenNotOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        faucet.withdraw(attacker, CLAIM_AMOUNT);
    }
}
