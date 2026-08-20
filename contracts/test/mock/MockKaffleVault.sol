// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IKaffleVault} from "../../src/interfaces/IKaffleVault.sol";

contract MockKaffleVault is IKaffleVault {
    mapping(address raffle => uint256 amount) public attachedAmount;
    address public lastAttachedRaffle;
    uint256 public lastAttachedAmount;
    uint256 public attachCount;

    address public lastReleasedRaffle;
    uint256 public releaseCount;

    bool public attachShouldRevert;

    function setAttachShouldRevert(bool attachShouldRevert_) external {
        attachShouldRevert = attachShouldRevert_;
    }

    function setFactory(address) external override {}

    function attachPrize(address raffle, uint256 amount) external override {
        if (attachShouldRevert) revert InsufficientFunds();
        attachedAmount[raffle] = amount;
        lastAttachedRaffle = raffle;
        lastAttachedAmount = amount;
        attachCount += 1;
        emit PrizeAttached(raffle, amount);
    }

    function releaseUnwon(address raffle) external override {
        lastReleasedRaffle = raffle;
        releaseCount += 1;
        emit PrizeReleased(raffle, attachedAmount[raffle]);
        delete attachedAmount[raffle];
    }

    function claim(address) external override {}

    function token() external pure override returns (address) {
        return address(0);
    }

    function factory() external pure override returns (address) {
        return address(0);
    }

    function prizeOf(address raffle) external view override returns (uint256 amount, bool claimed, bool attached) {
        amount = attachedAmount[raffle];
        claimed = false;
        attached = amount != 0;
    }
}
