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
    }

    uint256 public constant ETH_SEPOLIA_CHAIN_ID = 11_155_111;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84_532;
    uint256 public constant LOCAL_CHAIN_ID = 31_337;

    uint256 public constant DEFAULT_ANVIL_PRIVATE_KEY =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address public constant DEFAULT_ANVIL_TICKET_SIGNER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    uint16 public constant DEFAULT_REQUEST_CONFIRMATIONS = 3;
    uint32 public constant DEFAULT_CALLBACK_GAS_LIMIT = 500_000;
    bool public constant DEFAULT_NATIVE_PAYMENT = true;

    address public constant SEPOLIA_VRF_COORDINATOR = 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B;
    bytes32 public constant SEPOLIA_KEY_HASH = 0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae;
    address public constant SEPOLIA_USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    address public constant BASE_SEPOLIA_VRF_COORDINATOR = 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE;
    bytes32 public constant BASE_SEPOLIA_KEY_HASH = 0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71;
    address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

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
        return _testnetConfig({
            coordinator: SEPOLIA_VRF_COORDINATOR,
            keyHash: SEPOLIA_KEY_HASH,
            defaultPrizeToken: SEPOLIA_USDC,
            subscriptionIdKey: "SEPOLIA_VRF_SUBSCRIPTION_ID",
            ticketSignerKey: "SEPOLIA_TICKET_SIGNER",
            ownerKey: "SEPOLIA_OWNER",
            prizeTokenKey: "SEPOLIA_PRIZE_TOKEN"
        });
    }

    function getBaseSepoliaConfig() public view returns (NetworkConfig memory) {
        return _testnetConfig({
            coordinator: BASE_SEPOLIA_VRF_COORDINATOR,
            keyHash: BASE_SEPOLIA_KEY_HASH,
            defaultPrizeToken: BASE_SEPOLIA_USDC,
            subscriptionIdKey: "BASE_SEPOLIA_VRF_SUBSCRIPTION_ID",
            ticketSignerKey: "BASE_SEPOLIA_TICKET_SIGNER",
            ownerKey: "BASE_SEPOLIA_OWNER",
            prizeTokenKey: "BASE_SEPOLIA_PRIZE_TOKEN"
        });
    }

    function getOrCreateAnvilConfig() public returns (NetworkConfig memory) {
        if (_localNetworkConfig.vrfCoordinator != address(0)) {
            return _localNetworkConfig;
        }

        uint256 deployerKey = DEFAULT_ANVIL_PRIVATE_KEY;
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        MockVRFCoordinator coordinator = new MockVRFCoordinator();
        MockERC20 prizeToken = new MockERC20();
        vm.stopBroadcast();

        _localNetworkConfig = NetworkConfig({
            prizeToken: address(prizeToken),
            vrfCoordinator: address(coordinator),
            keyHash: bytes32(uint256(1)),
            subscriptionId: 1,
            requestConfirmations: DEFAULT_REQUEST_CONFIRMATIONS,
            callbackGasLimit: DEFAULT_CALLBACK_GAS_LIMIT,
            nativePayment: DEFAULT_NATIVE_PAYMENT,
            ticketSigner: _optionalAddress("ANVIL_TICKET_SIGNER", DEFAULT_ANVIL_TICKET_SIGNER),
            owner: _optionalAddress("ANVIL_OWNER", deployer),
            deployerKey: deployerKey
        });

        return _localNetworkConfig;
    }

    function _testnetConfig(
        address coordinator,
        bytes32 keyHash,
        address defaultPrizeToken,
        string memory subscriptionIdKey,
        string memory ticketSignerKey,
        string memory ownerKey,
        string memory prizeTokenKey
    ) private view returns (NetworkConfig memory) {
        uint256 deployerKey = _requiredUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        return NetworkConfig({
            prizeToken: _optionalAddress(prizeTokenKey, defaultPrizeToken),
            vrfCoordinator: coordinator,
            keyHash: keyHash,
            subscriptionId: _requiredUint(subscriptionIdKey),
            requestConfirmations: DEFAULT_REQUEST_CONFIRMATIONS,
            callbackGasLimit: DEFAULT_CALLBACK_GAS_LIMIT,
            nativePayment: DEFAULT_NATIVE_PAYMENT,
            ticketSigner: _requiredAddress(ticketSignerKey),
            owner: _optionalAddress(ownerKey, deployer),
            deployerKey: deployerKey
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
}
