// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockKaffleFactory {
    address public ticketSigner;
    uint256 public requestIdToReturn = 99;
    uint256 public randomnessCalls;
    bool public revertOnRequest;

    function setTicketSigner(address ticketSigner_) external {
        ticketSigner = ticketSigner_;
    }

    function setRequestId(uint256 requestId) external {
        requestIdToReturn = requestId;
    }

    function setRevertOnRequest(bool revertOnRequest_) external {
        revertOnRequest = revertOnRequest_;
    }

    function requestRandomness() external returns (uint256) {
        if (revertOnRequest) revert("request failed");
        randomnessCalls += 1;
        return requestIdToReturn;
    }
}
