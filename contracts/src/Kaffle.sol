// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {IKaffle} from "./interfaces/IKaffle.sol";
import {IKaffleFactory} from "./interfaces/IKaffleFactory.sol";

contract Kaffle is IKaffle {
    uint256 public constant MAX_TICKETS_PER_ENTER = 100;

    bytes32 private constant _ENTER_TYPEHASH =
        keccak256("Enter(address user,address raffle,uint256 ticketCount,uint256 nonce,uint256 deadline)");
    bytes32 private constant _DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant _NAME_HASH = keccak256("Kaffle");
    bytes32 private constant _VERSION_HASH = keccak256("1");

    struct Entry {
        address user;
        uint256 cumulativeTickets;
    }

    address private _factory;
    address private _vault;
    uint64 private _startTime;
    uint64 private _endTime;
    uint256 private _totalTickets;
    uint256 private _vrfRequestId;
    address private _winner;
    bytes32 private _cachedDomainSeparator;
    uint256 private _cachedChainId;

    Entry[] private _entries;
    mapping(address user => uint256 nonce) private _nonces;

    constructor() {
        _factory = address(1);
    }

    function initialize(address factory_, address vault_, uint64 startTime_, uint64 endTime_) external {
        if (_factory != address(0)) revert AlreadyInitialized();
        if (msg.sender != factory_) revert OnlyFactory();
        if (vault_ == address(0)) revert ZeroAddress();
        if (endTime_ <= startTime_) revert InvalidWindow();

        _factory = factory_;
        _vault = vault_;
        _startTime = startTime_;
        _endTime = endTime_;
        _cachedChainId = block.chainid;
        _cachedDomainSeparator = _domainSeparator();
    }

    function enter(address user, uint256 ticketCount, uint256 deadline, bytes calldata signature) external {
        if (user == address(0)) revert ZeroAddress();
        if (block.timestamp < _startTime || block.timestamp >= _endTime) revert RoundClosed();
        if (ticketCount == 0 || ticketCount > MAX_TICKETS_PER_ENTER) revert InvalidTicketCount();
        if (block.timestamp > deadline) revert SignatureExpired();

        uint256 currentNonce = _nonces[user];
        bytes32 structHash =
            keccak256(abi.encode(_ENTER_TYPEHASH, user, address(this), ticketCount, currentNonce, deadline));
        address signer = ECDSA.recoverCalldata(_hashTypedData(structHash), signature);
        if (signer != IKaffleFactory(_factory).ticketSigner()) revert InvalidSignature();

        _nonces[user] = currentNonce + 1;
        uint256 newTotal = _totalTickets + ticketCount;
        _totalTickets = newTotal;
        _entries.push(Entry({user: user, cumulativeTickets: newTotal}));

        emit Entered(user, ticketCount, newTotal);
    }

    function requestWinner() external {
        if (block.timestamp < _endTime) revert RoundOpen();
        if (_totalTickets == 0) revert NoEntries();
        if (_winner != address(0)) revert AlreadySettled();
        if (_vrfRequestId != 0) revert AlreadyRequested();

        _vrfRequestId = 1;
        uint256 requestId = IKaffleFactory(_factory).requestRandomness();
        _vrfRequestId = requestId;
        emit WinnerRequested(requestId);
    }

    function settle(uint256 randomWord) external {
        if (msg.sender != _factory) revert OnlyFactory();
        if (_winner != address(0)) return;
        if (_totalTickets == 0) revert NoEntries();

        (address selected, uint256 slot) = _selectWinner(randomWord);
        _winner = selected;
        emit WinnerSettled(selected, slot, randomWord);
    }

    function isFinished() external view returns (bool) {
        if (_winner != address(0)) return true;
        return block.timestamp >= _endTime && _totalTickets == 0;
    }

    function winner() external view returns (address) {
        return _winner;
    }

    function factory() external view returns (address) {
        return _factory;
    }

    function vault() external view returns (address) {
        return _vault;
    }

    function startTime() external view returns (uint64) {
        return _startTime;
    }

    function endTime() external view returns (uint64) {
        return _endTime;
    }

    function totalTickets() external view returns (uint256) {
        return _totalTickets;
    }

    function nonce(address user) external view returns (uint256) {
        return _nonces[user];
    }

    function entryCount() external view returns (uint256) {
        return _entries.length;
    }

    function entryAt(uint256 index) external view returns (address user, uint256 cumulativeTickets) {
        Entry storage item = _entries[index];
        return (item.user, item.cumulativeTickets);
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _hashDomain();
    }

    function _selectWinner(uint256 randomWord) private view returns (address, uint256) {
        uint256 slot = randomWord % _totalTickets;
        uint256 lo = 0;
        uint256 hi = _entries.length;
        while (lo < hi) {
            uint256 mid = (lo + hi) >> 1;
            if (_entries[mid].cumulativeTickets > slot) {
                hi = mid;
            } else {
                lo = mid + 1;
            }
        }
        return (_entries[lo].user, slot);
    }

    function _hashTypedData(bytes32 structHash) private view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _hashDomain(), structHash));
    }

    function _hashDomain() private view returns (bytes32) {
        if (block.chainid == _cachedChainId) return _cachedDomainSeparator;
        return _domainSeparator();
    }

    function _domainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(_DOMAIN_TYPEHASH, _NAME_HASH, _VERSION_HASH, block.chainid, address(this)));
    }
}
