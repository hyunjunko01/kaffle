// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

import {HelperConfig} from "../config/HelperConfig.s.sol";
import {Kaffle} from "../../src/Kaffle.sol";
import {KaffleFactory} from "../../src/KaffleFactory.sol";
import {KaffleVault} from "../../src/KaffleVault.sol";

contract DeployKaffle is Script {
    function run()
        external
        returns (Kaffle implementation, KaffleVault vault, KaffleFactory factory, HelperConfig helperConfig)
    {
        helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        vm.startBroadcast(config.deployerKey);

        implementation = new Kaffle();
        vault = new KaffleVault(config.prizeToken, vm.addr(config.deployerKey));
        factory = new KaffleFactory(
            config.owner,
            address(implementation),
            address(vault),
            config.vrfCoordinator,
            config.ticketSigner,
            helperConfig.getVRFConfig(config)
        );
        vault.setFactory(address(factory));

        if (config.owner != vm.addr(config.deployerKey)) {
            vault.transferOwnership(config.owner);
        }

        vm.stopBroadcast();

        console.log("Kaffle implementation", address(implementation));
        console.log("KaffleVault", address(vault));
        console.log("KaffleFactory", address(factory));
        console.log("Prize token", config.prizeToken);
        console.log("VRF coordinator", config.vrfCoordinator);
        console.log("Owner", config.owner);
        console.log("Ticket signer", config.ticketSigner);
    }
}
