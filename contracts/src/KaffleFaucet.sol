// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {IKaffleFaucet} from "./interfaces/IKaffleFaucet.sol";

contract KaffleFaucet is IKaffleFaucet, Ownable {
    using SafeERC20 for IERC20;

    bytes32 private constant _CLAIM_TYPEHASH =
        keccak256("Claim(address user,address faucet,uint256 amount,uint256 deadline)");
    bytes32 private constant _DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant _NAME_HASH = keccak256("KaffleFaucet");
    bytes32 private constant _VERSION_HASH = keccak256("1");

    IERC20 private immutable _token;
    uint256 private immutable _claimAmount;
    address private _signer;
    bool private _paused;
    mapping(address user => bool claimed) private _claimed;

    constructor(address token_, address owner_, address signer_, uint256 claimAmount_) Ownable(owner_) {
        if (token_ == address(0) || signer_ == address(0)) revert ZeroAddress();
        if (claimAmount_ == 0) revert ZeroAmount();

        _token = IERC20(token_);
        _signer = signer_;
        _claimAmount = claimAmount_;
    }

    function claim(address user, uint256 deadline, bytes calldata signature) external {
        if (_paused) revert Paused();
        if (user == address(0)) revert ZeroAddress();
        if (_claimed[user]) revert AlreadyClaimed();
        if (block.timestamp > deadline) revert SignatureExpired();

        uint256 amount = _claimAmount;
        if (_token.balanceOf(address(this)) < amount) revert InsufficientFunds();

        bytes32 structHash = keccak256(abi.encode(_CLAIM_TYPEHASH, user, address(this), amount, deadline));
        address recovered = ECDSA.recoverCalldata(_hashTypedData(structHash), signature);
        if (recovered != _signer) revert InvalidSignature();

        _claimed[user] = true;
        _token.safeTransfer(user, amount);
        emit Claimed(user, amount);
    }

    function pause() external onlyOwner {
        _paused = true;
        emit PausedSet(true);
    }

    function unpause() external onlyOwner {
        _paused = false;
        emit PausedSet(false);
    }

    function setSigner(address signer_) external onlyOwner {
        if (signer_ == address(0)) revert ZeroAddress();
        _signer = signer_;
        emit SignerUpdated(signer_);
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _token.safeTransfer(to, amount);
        emit Withdrawn(to, amount);
    }

    function token() external view returns (address) {
        return address(_token);
    }

    function signer() external view returns (address) {
        return _signer;
    }

    function claimAmount() external view returns (uint256) {
        return _claimAmount;
    }

    function paused() external view returns (bool) {
        return _paused;
    }

    function claimed(address user) external view returns (bool) {
        return _claimed[user];
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparator();
    }

    function _hashTypedData(bytes32 structHash) private view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
    }

    function _domainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(_DOMAIN_TYPEHASH, _NAME_HASH, _VERSION_HASH, block.chainid, address(this)));
    }
}
