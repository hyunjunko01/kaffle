// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";

import {KaffleFactory} from "../../src/KaffleFactory.sol";
import {MockERC20} from "../../test/mock/MockERC20.sol";
import {MockVRFCoordinator} from "../../test/mock/MockVRFCoordinator.sol";

contract HelperConfig is Script {
    error HelperConfig__MissingEnv(string name);
    error HelperConfig__UnsupportedChain(uint256 chainId);

    struct NetworkConfig {
        address prizeToken;
        address vrfCoordinator;
        bytes32 keyHash;
        uint256 subscriptionId;
        uint16 requestConfirmations;
        uint32 callbackGasLimit;
        bool nativePayment;
        address ticketSigner;
        address owner;
        uint256 deployerKey;
        uint256 faucetClaimAmount;
    }

    uint256 public constant ETH_SEPOLIA_CHAIN_ID = 11_155_111;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84_532;
    uint256 public constant BASE_CHAIN_ID = 8453;
    uint256 public constant LOCAL_CHAIN_ID = 31_337;

    NetworkConfig private _localNetworkConfig;

    function getConfig() public returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public returns (NetworkConfig memory) {
        if (chainId == ETH_SEPOLIA_CHAIN_ID) {
            return getSepoliaConfig();
        }
        if (chainId == BASE_SEPOLIA_CHAIN_ID) {
            return getBaseSepoliaConfig();
        }
        if (chainId == BASE_CHAIN_ID) {
            return getBaseConfig();
        }
        if (chainId == LOCAL_CHAIN_ID) {
            return getOrCreateAnvilConfig();
        }
        revert HelperConfig__UnsupportedChain(chainId);
    }

    function getVRFConfig(NetworkConfig memory config) public pure returns (KaffleFactory.VRFConfig memory) {
        return KaffleFactory.VRFConfig({
            keyHash: config.keyHash,
            subscriptionId: config.subscriptionId,
            requestConfirmations: config.requestConfirmations,
            callbackGasLimit: config.callbackGasLimit,
            nativePayment: config.nativePayment
        });
    }

    function getSepoliaConfig() public view returns (NetworkConfig memory) {
        return _remoteConfig({
            deployerKeyName: "PRIVATE_KEY",
            prizeTokenKey: "SEPOLIA_PRIZE_TOKEN",
            vrfCoordinatorKey: "SEPOLIA_VRF_COORDINATOR",
            keyHashKey: "SEPOLIA_VRF_KEY_HASH",
            subscriptionIdKey: "SEPOLIA_VRF_SUBSCRIPTION_ID",
            requestConfirmationsKey: "SEPOLIA_VRF_REQUEST_CONFIRMATIONS",
            callbackGasLimitKey: "SEPOLIA_VRF_CALLBACK_GAS_LIMIT",
            nativePaymentKey: "SEPOLIA_VRF_NATIVE_PAYMENT",
            ticketSignerKey: "SEPOLIA_TICKET_SIGNER",
            ownerKey: "SEPOLIA_OWNER",
            faucetClaimAmountKey: "FAUCET_CLAIM_AMOUNT"
        });
    }

    function getBaseSepoliaConfig() public view returns (NetworkConfig memory) {
        return _remoteConfig({
            deployerKeyName: "PRIVATE_KEY",
            prizeTokenKey: "BASE_SEPOLIA_PRIZE_TOKEN",
            vrfCoordinatorKey: "BASE_SEPOLIA_VRF_COORDINATOR",
            keyHashKey: "BASE_SEPOLIA_VRF_KEY_HASH",
            subscriptionIdKey: "BASE_SEPOLIA_VRF_SUBSCRIPTION_ID",
            requestConfirmationsKey: "BASE_SEPOLIA_VRF_REQUEST_CONFIRMATIONS",
            callbackGasLimitKey: "BASE_SEPOLIA_VRF_CALLBACK_GAS_LIMIT",
            nativePaymentKey: "BASE_SEPOLIA_VRF_NATIVE_PAYMENT",
            ticketSignerKey: "BASE_SEPOLIA_TICKET_SIGNER",
            ownerKey: "BASE_SEPOLIA_OWNER",
            faucetClaimAmountKey: "FAUCET_CLAIM_AMOUNT"
        });
    }

    function getBaseConfig() public view returns (NetworkConfig memory) {
        return _remoteConfig({
            deployerKeyName: "PRIVATE_KEY",
            prizeTokenKey: "BASE_PRIZE_TOKEN",
            vrfCoordinatorKey: "BASE_VRF_COORDINATOR",
            keyHashKey: "BASE_VRF_KEY_HASH",
            subscriptionIdKey: "BASE_VRF_SUBSCRIPTION_ID",
            requestConfirmationsKey: "BASE_VRF_REQUEST_CONFIRMATIONS",
            callbackGasLimitKey: "BASE_VRF_CALLBACK_GAS_LIMIT",
            nativePaymentKey: "BASE_VRF_NATIVE_PAYMENT",
            ticketSignerKey: "BASE_TICKET_SIGNER",
            ownerKey: "BASE_OWNER",
            faucetClaimAmountKey: "FAUCET_CLAIM_AMOUNT"
        });
    }

    function getOrCreateAnvilConfig() public returns (NetworkConfig memory) {
        if (_localNetworkConfig.vrfCoordinator != address(0)) {
            return _localNetworkConfig;
        }

        uint256 deployerKey = _requiredUint("ANVIL_PRIVATE_KEY");
        address owner = _requiredAddress("ANVIL_OWNER");
        address ticketSigner = _requiredAddress("ANVIL_TICKET_SIGNER");
        address prizeToken = _optionalAddress("ANVIL_PRIZE_TOKEN", address(0));

        vm.startBroadcast(deployerKey);
        MockVRFCoordinator coordinator = new MockVRFCoordinator();
        if (prizeToken == address(0)) {
            prizeToken = address(new MockERC20());
        }
        vm.stopBroadcast();

        _localNetworkConfig = NetworkConfig({
            prizeToken: prizeToken,
            vrfCoordinator: address(coordinator),
            keyHash: _optionalBytes32("ANVIL_VRF_KEY_HASH", bytes32(uint256(1))),
            subscriptionId: _optionalUint("ANVIL_VRF_SUBSCRIPTION_ID", 1),
            requestConfirmations: uint16(_optionalUint("ANVIL_VRF_REQUEST_CONFIRMATIONS", 3)),
            callbackGasLimit: uint32(_optionalUint("ANVIL_VRF_CALLBACK_GAS_LIMIT", 500_000)),
            nativePayment: _optionalBool("ANVIL_VRF_NATIVE_PAYMENT", true),
            ticketSigner: ticketSigner,
            owner: owner,
            deployerKey: deployerKey,
            faucetClaimAmount: _optionalUint("FAUCET_CLAIM_AMOUNT", 0.001e18)
        });

        return _localNetworkConfig;
    }

    function _remoteConfig(
        string memory deployerKeyName,
        string memory prizeTokenKey,
        string memory vrfCoordinatorKey,
        string memory keyHashKey,
        string memory subscriptionIdKey,
        string memory requestConfirmationsKey,
        string memory callbackGasLimitKey,
        string memory nativePaymentKey,
        string memory ticketSignerKey,
        string memory ownerKey,
        string memory faucetClaimAmountKey
    ) private view returns (NetworkConfig memory) {
        return NetworkConfig({
            prizeToken: _requiredAddress(prizeTokenKey),
            vrfCoordinator: _requiredAddress(vrfCoordinatorKey),
            keyHash: _requiredBytes32(keyHashKey),
            subscriptionId: _requiredUint(subscriptionIdKey),
            requestConfirmations: uint16(_optionalUint(requestConfirmationsKey, 3)),
            callbackGasLimit: uint32(_optionalUint(callbackGasLimitKey, 500_000)),
            nativePayment: _optionalBool(nativePaymentKey, true),
            ticketSigner: _requiredAddress(ticketSignerKey),
            owner: _requiredAddress(ownerKey),
            deployerKey: _requiredUint(deployerKeyName),
            faucetClaimAmount: _optionalUint(faucetClaimAmountKey, 1000)
        });
    }

    function _requiredAddress(string memory name) private view returns (address value) {
        value = _optionalAddress(name, address(0));
        if (value == address(0)) revert HelperConfig__MissingEnv(name);
    }

    function _requiredUint(string memory name) private view returns (uint256 value) {
        if (!vm.envExists(name)) revert HelperConfig__MissingEnv(name);
        try vm.envUint(name) returns (uint256 parsed) {
            return parsed;
        } catch {
            revert HelperConfig__MissingEnv(name);
        }
    }

    function _requiredBytes32(string memory name) private view returns (bytes32 value) {
        if (!vm.envExists(name)) revert HelperConfig__MissingEnv(name);
        try vm.envBytes32(name) returns (bytes32 parsed) {
            return parsed;
        } catch {
            revert HelperConfig__MissingEnv(name);
        }
    }

    function _optionalAddress(string memory name, address fallbackValue) private view returns (address) {
        if (!vm.envExists(name)) return fallbackValue;
        try vm.envAddress(name) returns (address value) {
            return value == address(0) ? fallbackValue : value;
        } catch {
            return fallbackValue;
        }
    }

    function _optionalUint(string memory name, uint256 fallbackValue) private view returns (uint256) {
        if (!vm.envExists(name)) return fallbackValue;
        try vm.envUint(name) returns (uint256 value) {
            return value;
        } catch {
            return fallbackValue;
        }
    }

    function _optionalBytes32(string memory name, bytes32 fallbackValue) private view returns (bytes32) {
        if (!vm.envExists(name)) return fallbackValue;
        try vm.envBytes32(name) returns (bytes32 value) {
            return value;
        } catch {
            return fallbackValue;
        }
    }

    function _optionalBool(string memory name, bool fallbackValue) private view returns (bool) {
        if (!vm.envExists(name)) return fallbackValue;
        try vm.envBool(name) returns (bool value) {
            return value;
        } catch {
            return fallbackValue;
        }
    }
}
