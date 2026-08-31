// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

abstract contract SigUtils is Test {
    bytes32 internal constant ENTER_TYPEHASH =
        keccak256("Enter(address user,address raffle,uint256 ticketCount,uint256 nonce,uint256 deadline)");
    bytes32 internal constant CLAIM_TYPEHASH =
        keccak256("Claim(address user,address faucet,uint256 amount,uint256 deadline)");
    bytes32 internal constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    function _domainSeparator(address raffle) internal view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256("Kaffle"), keccak256("1"), block.chainid, raffle));
    }

    function _signEnter(
        uint256 privateKey,
        address raffle,
        address user,
        uint256 ticketCount,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(ENTER_TYPEHASH, user, raffle, ticketCount, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(raffle), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _faucetDomainSeparator(address faucet) internal view returns (bytes32) {
        return keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256("KaffleFaucet"), keccak256("1"), block.chainid, faucet)
        );
    }

    function _signClaim(
        uint256 privateKey,
        address faucet,
        address user,
        uint256 amount,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, user, faucet, amount, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _faucetDomainSeparator(faucet), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
