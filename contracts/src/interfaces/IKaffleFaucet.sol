// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKaffleFaucet {
    error AlreadyClaimed();
    error InsufficientFunds();
    error InvalidSignature();
    error Paused();
    error SignatureExpired();
    error ZeroAddress();
    error ZeroAmount();

    event SignerUpdated(address indexed signer);
    event PausedSet(bool paused);
    event Claimed(address indexed user, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    function claim(address user, uint256 deadline, bytes calldata signature) external;

    function pause() external;

    function unpause() external;

    function setSigner(address signer) external;

    function withdraw(address to, uint256 amount) external;

    function token() external view returns (address);

    function signer() external view returns (address);

    function claimAmount() external view returns (uint256);

    function paused() external view returns (bool);

    function claimed(address user) external view returns (bool);
}
