// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IKaffle} from "../../src/interfaces/IKaffle.sol";
import {IKaffleFactory} from "../../src/interfaces/IKaffleFactory.sol";

contract MockKaffle is IKaffle {
    address public override factory;
    address public override vault;
    uint64 public override startTime;
    uint64 public override endTime;
    uint256 public override totalTickets;
    address public override winner;

    bool public finished;
    uint256 public lastRandomWord;
    uint256 public lastRequestId;
    mapping(address user => uint256) public override nonce;

    function initialize(address factory_, address vault_, uint64 startTime_, uint64 endTime_) external override {
        factory = factory_;
        vault = vault_;
        startTime = startTime_;
        endTime = endTime_;
    }

    function setFinished(bool finished_) external {
        finished = finished_;
    }

    function setWinner(address winner_) external {
        winner = winner_;
    }

    function setTotalTickets(uint256 totalTickets_) external {
        totalTickets = totalTickets_;
    }

    function enter(address, uint256, uint256, bytes calldata) external override {}

    function requestWinner() external override {
        lastRequestId = IKaffleFactory(factory).requestRandomness();
    }

    function settle(uint256 randomWord) external override {
        lastRandomWord = randomWord;
        if (winner == address(0) && totalTickets > 0) {
            winner = address(uint160(randomWord));
        }
    }

    function isFinished() external view override returns (bool) {
        return finished;
    }
}
