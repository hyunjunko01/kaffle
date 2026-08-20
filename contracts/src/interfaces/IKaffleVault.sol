// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKaffleVault {
    error AlreadyAttached();
    error AlreadyClaimed();
    error AlreadySet();
    error InsufficientFunds();
    error InsufficientUnallocated();
    error NoWinner();
    error OnlyFactory();
    error PrizeNotAttached();
    error ZeroAddress();
    error ZeroAmount();

    event FactorySet(address indexed factory);
    event PrizeAttached(address indexed raffle, uint256 amount);
    event PrizeReleased(address indexed raffle, uint256 amount);
    event Claimed(address indexed raffle, address indexed winner, uint256 amount);

    function setFactory(address factory) external;

    function attachPrize(address raffle, uint256 amount) external;

    function releaseUnwon(address raffle) external;

    function claim(address raffle) external;

    function token() external view returns (address);

    function factory() external view returns (address);

    function prizeOf(address raffle) external view returns (uint256 amount, bool claimed, bool attached);
}
