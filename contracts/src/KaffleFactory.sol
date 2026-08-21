// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/vrf/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/libraries/VRFV2PlusClient.sol";

import {IKaffle} from "./interfaces/IKaffle.sol";
import {IKaffleFactory} from "./interfaces/IKaffleFactory.sol";
import {IKaffleVault} from "./interfaces/IKaffleVault.sol";

contract KaffleFactory is IKaffleFactory, Ownable {
    using Clones for address;

    struct VRFConfig {
        bytes32 keyHash;
        uint256 subscriptionId;
        uint16 requestConfirmations;
        uint32 callbackGasLimit;
        bool nativePayment;
    }

    address public immutable override implementation;
    address public immutable override vault;

    address public override ticketSigner;
    address public override currentRaffle;
    address public vrfCoordinator;
    VRFConfig public vrfConfig;

    mapping(address raffle => bool allowed) private _isRaffle;
    mapping(uint256 requestId => address raffle) private _requestToRaffle;

    constructor(
        address owner_,
        address implementation_,
        address vault_,
        address vrfCoordinator_,
        address ticketSigner_,
        VRFConfig memory vrfConfig_
    ) Ownable(owner_) {
        if (
            implementation_ == address(0) || vault_ == address(0) || vrfCoordinator_ == address(0)
                || ticketSigner_ == address(0)
        ) {
            revert ZeroAddress();
        }

        implementation = implementation_;
        vault = vault_;
        vrfCoordinator = vrfCoordinator_;
        ticketSigner = ticketSigner_;
        vrfConfig = vrfConfig_;
    }

    function createRaffle(uint64 duration, uint256 prizeAmount) external onlyOwner returns (address raffle) {
        if (duration == 0) revert InvalidDuration();
        if (prizeAmount == 0) revert InvalidPrize();

        address current = currentRaffle;
        if (current != address(0)) {
            IKaffle currentRaffle_ = IKaffle(current);
            if (!currentRaffle_.isFinished()) revert RaffleActive();
            if (currentRaffle_.winner() == address(0)) {
                IKaffleVault(vault).releaseUnwon(current);
            }
        }

        raffle = implementation.clone();
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + duration;
        if (endTime < startTime) revert InvalidDuration();
        _isRaffle[raffle] = true;
        currentRaffle = raffle;

        IKaffle(raffle).initialize(address(this), vault, startTime, endTime);
        IKaffleVault(vault).attachPrize(raffle, prizeAmount);

        emit RaffleCreated(raffle, startTime, endTime, prizeAmount);
    }

    function requestRandomness() external returns (uint256 requestId) {
        if (!_isRaffle[msg.sender]) revert NotRaffle();

        VRFConfig memory config = vrfConfig;
        requestId = IVRFCoordinatorV2Plus(vrfCoordinator)
            .requestRandomWords(
                VRFV2PlusClient.RandomWordsRequest({
                keyHash: config.keyHash,
                subId: config.subscriptionId,
                requestConfirmations: config.requestConfirmations,
                callbackGasLimit: config.callbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: config.nativePayment})
                )
            })
            );

        _requestToRaffle[requestId] = msg.sender;
        emit RandomnessRequested(msg.sender, requestId);
    }

    function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != vrfCoordinator) revert OnlyCoordinator();

        address raffle = _requestToRaffle[requestId];
        if (raffle == address(0)) revert UnknownRequest();
        delete _requestToRaffle[requestId];

        IKaffle(raffle).settle(randomWords[0]);
    }

    function setTicketSigner(address ticketSigner_) external onlyOwner {
        if (ticketSigner_ == address(0)) revert ZeroAddress();
        ticketSigner = ticketSigner_;
        emit TicketSignerUpdated(ticketSigner_);
    }

    function setVRFCoordinator(address vrfCoordinator_) external onlyOwner {
        if (vrfCoordinator_ == address(0)) revert ZeroAddress();
        vrfCoordinator = vrfCoordinator_;
    }

    function setVRFConfig(VRFConfig calldata vrfConfig_) external onlyOwner {
        vrfConfig = vrfConfig_;
    }

    function isRaffle(address raffle) external view returns (bool) {
        return _isRaffle[raffle];
    }
}
