// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {Kaffle} from "../../src/Kaffle.sol";
import {IKaffle} from "../../src/interfaces/IKaffle.sol";
import {SigUtils} from "../helpers/SigUtils.sol";
import {MockKaffleFactory} from "../mock/MockKaffleFactory.sol";

contract KaffleTest is SigUtils {
    Kaffle internal implementation;
    Kaffle internal raffle;
    MockKaffleFactory internal factory;

    address internal vault;
    address internal user;
    address internal relayer;
    uint256 internal signerPk;
    address internal signer;

    uint64 internal startTime;
    uint64 internal endTime;

    function setUp() public {
        vault = makeAddr("vault");
        user = makeAddr("user");
        relayer = makeAddr("relayer");
        (signer, signerPk) = makeAddrAndKey("signer");

        implementation = new Kaffle();
        factory = new MockKaffleFactory();
        factory.setTicketSigner(signer);

        startTime = uint64(block.timestamp);
        endTime = startTime + 3 days;

        raffle = Kaffle(Clones.clone(address(implementation)));
        vm.prank(address(factory));
        raffle.initialize(address(factory), vault, startTime, endTime);
    }

    function _enterAs(address who, uint256 tickets, uint256 nonce, uint256 deadline)
        internal
        returns (bytes memory signature)
    {
        signature = _signEnter(signerPk, address(raffle), who, tickets, nonce, deadline);
        vm.prank(relayer);
        raffle.enter(who, tickets, deadline, signature);
    }

    function test_constructor_locksImplementation() public view {
        assertEq(implementation.factory(), address(1));
    }

    function test_initialize_revertsOnImplementation() public {
        vm.expectRevert(IKaffle.AlreadyInitialized.selector);
        implementation.initialize(address(factory), vault, startTime, endTime);
    }

    function test_initialize_setsState() public view {
        assertEq(raffle.factory(), address(factory));
        assertEq(raffle.vault(), vault);
        assertEq(raffle.startTime(), startTime);
        assertEq(raffle.endTime(), endTime);
        assertEq(raffle.totalTickets(), 0);
        assertEq(raffle.winner(), address(0));
        assertEq(raffle.entryCount(), 0);
        assertFalse(raffle.isFinished());
        assertEq(raffle.DOMAIN_SEPARATOR(), _domainSeparator(address(raffle)));
    }

    function test_initialize_revertsWhenNotFactory() public {
        Kaffle clone = Kaffle(Clones.clone(address(implementation)));
        vm.expectRevert(IKaffle.OnlyFactory.selector);
        clone.initialize(address(factory), vault, startTime, endTime);
    }

    function test_initialize_revertsWhenVaultZero() public {
        Kaffle clone = Kaffle(Clones.clone(address(implementation)));
        vm.prank(address(factory));
        vm.expectRevert(IKaffle.ZeroAddress.selector);
        clone.initialize(address(factory), address(0), startTime, endTime);
    }

    function test_initialize_revertsWhenEndNotAfterStart() public {
        Kaffle clone = Kaffle(Clones.clone(address(implementation)));
        vm.prank(address(factory));
        vm.expectRevert(IKaffle.InvalidWindow.selector);
        clone.initialize(address(factory), vault, startTime, startTime);
    }

    function test_initialize_revertsWhenAlreadyInitialized() public {
        vm.prank(address(factory));
        vm.expectRevert(IKaffle.AlreadyInitialized.selector);
        raffle.initialize(address(factory), vault, startTime, endTime);
    }

    function test_enter_recordsEntryAndIncrementsNonce() public {
        uint256 deadline = block.timestamp + 1 hours;

        vm.expectEmit(true, true, true, true, address(raffle));
        emit IKaffle.Entered(user, 10, 10);
        _enterAs(user, 10, 0, deadline);

        assertEq(raffle.totalTickets(), 10);
        assertEq(raffle.nonce(user), 1);
        assertEq(raffle.entryCount(), 1);
        (address entryUser, uint256 cumulative) = raffle.entryAt(0);
        assertEq(entryUser, user);
        assertEq(cumulative, 10);
    }

    function test_enter_allowsMultipleEntriesAndTracksCumulativeTickets() public {
        address userB = makeAddr("userB");
        uint256 deadline = block.timestamp + 1 hours;

        _enterAs(user, 10, 0, deadline);
        _enterAs(userB, 20, 0, deadline);
        _enterAs(user, 5, 1, deadline);

        assertEq(raffle.totalTickets(), 35);
        assertEq(raffle.nonce(user), 2);
        assertEq(raffle.nonce(userB), 1);
        assertEq(raffle.entryCount(), 3);

        (, uint256 c0) = raffle.entryAt(0);
        (, uint256 c1) = raffle.entryAt(1);
        (address lastUser, uint256 c2) = raffle.entryAt(2);
        assertEq(c0, 10);
        assertEq(c1, 30);
        assertEq(c2, 35);
        assertEq(lastUser, user);
    }

    function test_enter_revertsWhenUserZero() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signEnter(signerPk, address(raffle), address(0), 1, 0, deadline);
        vm.expectRevert(IKaffle.ZeroAddress.selector);
        raffle.enter(address(0), 1, deadline, signature);
    }

    function test_enter_revertsBeforeStart() public {
        Kaffle clone = Kaffle(Clones.clone(address(implementation)));
        uint64 laterStart = uint64(block.timestamp + 1 days);
        vm.prank(address(factory));
        clone.initialize(address(factory), vault, laterStart, laterStart + 3 days);

        uint256 deadline = block.timestamp + 2 days;
        bytes memory signature = _signEnter(signerPk, address(clone), user, 1, 0, deadline);
        vm.expectRevert(IKaffle.RoundClosed.selector);
        clone.enter(user, 1, deadline, signature);
    }

    function test_enter_revertsAtEndTime() public {
        vm.warp(endTime);
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signEnter(signerPk, address(raffle), user, 1, 0, deadline);
        vm.expectRevert(IKaffle.RoundClosed.selector);
        raffle.enter(user, 1, deadline, signature);
    }

    function test_enter_revertsWhenTicketCountZero() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signEnter(signerPk, address(raffle), user, 0, 0, deadline);
        vm.expectRevert(IKaffle.InvalidTicketCount.selector);
        raffle.enter(user, 0, deadline, signature);
    }

    function test_enter_revertsWhenTicketCountAboveMax() public {
        uint256 deadline = block.timestamp + 1 hours;
        uint256 tooMany = raffle.MAX_TICKETS_PER_ENTER() + 1;
        bytes memory signature = _signEnter(signerPk, address(raffle), user, tooMany, 0, deadline);
        vm.expectRevert(IKaffle.InvalidTicketCount.selector);
        raffle.enter(user, tooMany, deadline, signature);
    }

    function test_enter_acceptsMaxTicketCount() public {
        uint256 deadline = block.timestamp + 1 hours;
        _enterAs(user, raffle.MAX_TICKETS_PER_ENTER(), 0, deadline);
        assertEq(raffle.totalTickets(), 100);
    }

    function test_enter_revertsWhenSignatureExpired() public {
        uint256 deadline = block.timestamp;
        vm.warp(deadline + 1);
        bytes memory signature = _signEnter(signerPk, address(raffle), user, 1, 0, deadline);
        vm.expectRevert(IKaffle.SignatureExpired.selector);
        raffle.enter(user, 1, deadline, signature);
    }

    function test_enter_revertsWhenSignerIsWrong() public {
        (, uint256 otherPk) = makeAddrAndKey("other");
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signEnter(otherPk, address(raffle), user, 1, 0, deadline);
        vm.expectRevert(IKaffle.InvalidSignature.selector);
        raffle.enter(user, 1, deadline, signature);
    }

    function test_enter_revertsWhenReplaySignature() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signEnter(signerPk, address(raffle), user, 10, 0, deadline);
        raffle.enter(user, 10, deadline, signature);
        vm.expectRevert(IKaffle.InvalidSignature.selector);
        raffle.enter(user, 10, deadline, signature);
    }

    function test_enter_revertsWhenBoundToDifferentRaffle() public {
        Kaffle other = Kaffle(Clones.clone(address(implementation)));
        vm.prank(address(factory));
        other.initialize(address(factory), vault, startTime, endTime);

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory signature = _signEnter(signerPk, address(other), user, 1, 0, deadline);
        vm.expectRevert(IKaffle.InvalidSignature.selector);
        raffle.enter(user, 1, deadline, signature);
    }

    function test_DOMAIN_SEPARATOR_updatesWhenChainIdChanges() public {
        bytes32 beforeSep = raffle.DOMAIN_SEPARATOR();
        vm.chainId(999);
        bytes32 afterSep = raffle.DOMAIN_SEPARATOR();
        assertTrue(beforeSep != afterSep);
        assertEq(afterSep, _domainSeparator(address(raffle)));
    }

    function test_requestWinner_requestsRandomnessAfterWindow() public {
        _enterAs(user, 10, 0, block.timestamp + 1 hours);
        vm.warp(endTime);

        vm.expectEmit(true, true, true, true, address(raffle));
        emit IKaffle.WinnerRequested(99);
        raffle.requestWinner();

        assertEq(factory.randomnessCalls(), 1);
        assertFalse(raffle.isFinished());
    }

    function test_requestWinner_revertsWhileRoundOpen() public {
        _enterAs(user, 10, 0, block.timestamp + 1 hours);
        vm.expectRevert(IKaffle.RoundOpen.selector);
        raffle.requestWinner();
    }

    function test_requestWinner_revertsWhenNoEntries() public {
        vm.warp(endTime);
        vm.expectRevert(IKaffle.NoEntries.selector);
        raffle.requestWinner();
    }

    function test_requestWinner_revertsWhenAlreadyRequested() public {
        _enterAs(user, 10, 0, block.timestamp + 1 hours);
        vm.warp(endTime);
        raffle.requestWinner();
        vm.expectRevert(IKaffle.AlreadyRequested.selector);
        raffle.requestWinner();
    }

    function test_requestWinner_revertsWhenAlreadySettled() public {
        _enterAs(user, 10, 0, block.timestamp + 1 hours);
        vm.prank(address(factory));
        raffle.settle(0);
        vm.warp(endTime);
        vm.expectRevert(IKaffle.AlreadySettled.selector);
        raffle.requestWinner();
    }

    function test_settle_revertsWhenNotFactory() public {
        _enterAs(user, 10, 0, block.timestamp + 1 hours);
        vm.expectRevert(IKaffle.OnlyFactory.selector);
        raffle.settle(0);
    }

    function test_settle_revertsWhenNoEntries() public {
        vm.prank(address(factory));
        vm.expectRevert(IKaffle.NoEntries.selector);
        raffle.settle(0);
    }

    function test_settle_selectsWinnerByWeightedSlot() public {
        address userB = makeAddr("userB");
        address userC = makeAddr("userC");
        uint256 deadline = block.timestamp + 1 hours;

        _enterAs(user, 10, 0, deadline);
        _enterAs(userB, 20, 0, deadline);
        _enterAs(userC, 5, 0, deadline);

        vm.prank(address(factory));
        vm.expectEmit(true, true, true, true, address(raffle));
        emit IKaffle.WinnerSettled(userB, 10, 10);
        raffle.settle(10);

        assertEq(raffle.winner(), userB);
        assertTrue(raffle.isFinished());
    }

    function test_settle_isNoopWhenAlreadySettled() public {
        address userB = makeAddr("userB");
        uint256 deadline = block.timestamp + 1 hours;
        _enterAs(user, 10, 0, deadline);
        _enterAs(userB, 10, 0, deadline);

        vm.prank(address(factory));
        raffle.settle(0);
        vm.prank(address(factory));
        raffle.settle(15);

        assertEq(raffle.winner(), user);
    }

    function testFuzz_settle_selectsEntryThatOwnsSlot(uint256 randomWord) public {
        address userB = makeAddr("userB");
        address userC = makeAddr("userC");
        uint256 deadline = block.timestamp + 1 hours;

        _enterAs(user, 10, 0, deadline);
        _enterAs(userB, 20, 0, deadline);
        _enterAs(userC, 5, 0, deadline);

        vm.prank(address(factory));
        raffle.settle(randomWord);

        uint256 slot = randomWord % 35;
        address expected = slot < 10 ? user : slot < 30 ? userB : userC;
        assertEq(raffle.winner(), expected);
    }

    function test_isFinished_trueWhenWindowEndedWithNoEntries() public {
        vm.warp(endTime);
        assertTrue(raffle.isFinished());
    }

    function test_isFinished_falseWhenWindowEndedWithUnsettledEntries() public {
        _enterAs(user, 1, 0, block.timestamp + 1 hours);
        vm.warp(endTime);
        assertFalse(raffle.isFinished());
    }

    function test_entryAt_revertsWhenEmpty() public {
        vm.expectRevert();
        raffle.entryAt(0);
    }
}
