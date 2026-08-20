// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IKaffle} from "./interfaces/IKaffle.sol";
import {IKaffleVault} from "./interfaces/IKaffleVault.sol";

contract KaffleVault is IKaffleVault, Ownable {
    using SafeERC20 for IERC20;

    struct Prize {
        uint256 amount;
        bool claimed;
        bool attached;
    }

    IERC20 private immutable _token;
    address private _factory;
    uint256 private _reserved;
    mapping(address raffle => Prize prize) private _prizes;

    constructor(address token_, address owner_) Ownable(owner_) {
        if (token_ == address(0)) revert ZeroAddress();
        _token = IERC20(token_);
    }

    function setFactory(address factory_) external onlyOwner {
        if (_factory != address(0)) revert AlreadySet();
        if (factory_ == address(0)) revert ZeroAddress();
        _factory = factory_;
        emit FactorySet(factory_);
    }

    function attachPrize(address raffle, uint256 amount) external {
        if (msg.sender != _factory) revert OnlyFactory();
        if (raffle == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (_prizes[raffle].attached) revert AlreadyAttached();
        if (_token.balanceOf(address(this)) < _reserved + amount) revert InsufficientFunds();

        _prizes[raffle] = Prize({amount: amount, claimed: false, attached: true});
        _reserved += amount;
        emit PrizeAttached(raffle, amount);
    }

    function releaseUnwon(address raffle) external {
        if (msg.sender != _factory) revert OnlyFactory();

        Prize storage prize = _prizes[raffle];
        if (!prize.attached || prize.claimed) return;
        if (IKaffle(raffle).winner() != address(0)) return;
        if (!IKaffle(raffle).isFinished()) return;

        uint256 amount = prize.amount;
        delete _prizes[raffle];
        _reserved -= amount;
        emit PrizeReleased(raffle, amount);
    }

    function claim(address raffle) external {
        Prize storage prize = _prizes[raffle];
        if (!prize.attached) revert PrizeNotAttached();
        if (prize.claimed) revert AlreadyClaimed();

        address winner_ = IKaffle(raffle).winner();
        if (winner_ == address(0)) revert NoWinner();

        prize.claimed = true;
        _reserved -= prize.amount;
        _token.safeTransfer(winner_, prize.amount);
        emit Claimed(raffle, winner_, prize.amount);
    }

    function withdrawUnallocated(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 available = unallocated();
        if (amount > available) revert InsufficientUnallocated();
        _token.safeTransfer(to, amount);
    }

    function token() external view returns (address) {
        return address(_token);
    }

    function factory() external view returns (address) {
        return _factory;
    }

    function reserved() external view returns (uint256) {
        return _reserved;
    }

    function unallocated() public view returns (uint256) {
        uint256 balance = _token.balanceOf(address(this));
        if (balance < _reserved) return 0;
        return balance - _reserved;
    }

    function prizeOf(address raffle) external view returns (uint256 amount, bool claimed, bool attached) {
        Prize storage prize = _prizes[raffle];
        return (prize.amount, prize.claimed, prize.attached);
    }
}
