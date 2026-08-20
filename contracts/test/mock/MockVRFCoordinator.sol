// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/libraries/VRFV2PlusClient.sol";

import {KaffleFactory} from "../../src/KaffleFactory.sol";

contract MockVRFCoordinator {
    uint256 public nextRequestId = 1;
    address public lastConsumer;
    VRFV2PlusClient.RandomWordsRequest public lastRequest;

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata req) external returns (uint256 requestId) {
        lastConsumer = msg.sender;
        lastRequest = req;
        requestId = nextRequestId;
        nextRequestId += 1;
    }

    function lastSubId() external view returns (uint256) {
        return lastRequest.subId;
    }

    function lastNumWords() external view returns (uint32) {
        return lastRequest.numWords;
    }

    function fulfill(address factory, uint256 requestId, uint256 randomWord) external {
        uint256[] memory words = new uint256[](1);
        words[0] = randomWord;
        KaffleFactory(factory).rawFulfillRandomWords(requestId, words);
    }
}
