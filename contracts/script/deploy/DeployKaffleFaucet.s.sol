// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

import {HelperConfig} from "../config/HelperConfig.s.sol";
import {KaffleFaucet} from "../../src/KaffleFaucet.sol";

contract DeployKaffleFaucet is Script {
    function run() external returns (KaffleFaucet faucet, HelperConfig helperConfig) {
        helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        vm.startBroadcast(config.deployerKey);

        faucet = new KaffleFaucet(
            config.prizeToken,
            vm.addr(config.deployerKey),
            config.ticketSigner,
            config.faucetClaimAmount
        );

        if (config.owner != vm.addr(config.deployerKey)) {
            faucet.transferOwnership(config.owner);
        }

        vm.stopBroadcast();

        console.log("KaffleFaucet", address(faucet));
        console.log("Prize token", config.prizeToken);
        console.log("Claim amount", config.faucetClaimAmount);
        console.log("Owner", config.owner);
        console.log("Signer", config.ticketSigner);
    }
}
