// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  CompetitionRegistry
 * @notice On-chain registration for the AlphaTrade autonomous-trading
 *         competition (Track 1, BNB Chain).
 *
 *         Each participant registers the wallet address its agent will trade
 *         from. The set of registered addresses forms an immutable, append-only
 *         participant list — no entry can ever be removed or altered, and no
 *         privileged role can mutate it. Registration is only accepted before
 *         the trading window opens; the deadline is fixed at deploy time and
 *         cannot be changed.
 *
 *         Self-custody: the canonical path is {register}, where the agent wallet
 *         signs and submits its own registration transaction (msg.sender is the
 *         agent). {registerAgent} is provided for operator/relayer submission
 *         and records which operator submitted, but the registered identity is
 *         always the agent address itself.
 *
 *         There is no owner, no admin, no upgrade path, and no funds held.
 */
contract CompetitionRegistry {
    /// @notice Unix timestamp at which the trading window opens. Registrations
    ///         submitted at or after this time are rejected. Immutable.
    uint256 public immutable registrationDeadline;

    /// @notice Append-only list of registered agent wallet addresses.
    address[] private _participants;

    /// @notice agent address => has registered.
    mapping(address => bool) public isRegistered;

    /// @notice agent address => 1-based registration index (0 means not set).
    mapping(address => uint256) private _indexPlusOne;

    /// @notice Emitted once per agent when it joins the participant list.
    /// @param agent     The registered agent wallet address.
    /// @param operator  The msg.sender that submitted the tx (== agent for {register}).
    /// @param index     The agent's 0-based position in the participant list.
    /// @param timestamp Block timestamp of registration.
    event AgentRegistered(
        address indexed agent,
        address indexed operator,
        uint256 index,
        uint256 timestamp
    );

    error RegistrationClosed(uint256 nowTs, uint256 deadline);
    error AlreadyRegistered(address agent);
    error ZeroAddress();

    /**
     * @param _registrationDeadline Unix timestamp when the trading window opens.
     *        Must be in the future at deploy time.
     */
    constructor(uint256 _registrationDeadline) {
        if (_registrationDeadline <= block.timestamp) {
            revert RegistrationClosed(block.timestamp, _registrationDeadline);
        }
        registrationDeadline = _registrationDeadline;
    }

    /**
     * @notice Register the caller as a competing agent (self-custodial path).
     *         The agent wallet signs and submits this transaction itself.
     */
    function register() external {
        _register(msg.sender, msg.sender);
    }

    /**
     * @notice Register a specific agent wallet address. Useful when an operator
     *         or relayer (e.g. the TWAK CLI / MCP action) submits on the agent's
     *         behalf. The registered identity is always `agent`, and the
     *         submitting `msg.sender` is recorded as the operator in the event.
     * @param agent The agent wallet address to register.
     */
    function registerAgent(address agent) external {
        if (agent == address(0)) revert ZeroAddress();
        _register(agent, msg.sender);
    }

    function _register(address agent, address operator) private {
        if (block.timestamp >= registrationDeadline) {
            revert RegistrationClosed(block.timestamp, registrationDeadline);
        }
        if (isRegistered[agent]) revert AlreadyRegistered(agent);

        isRegistered[agent] = true;
        _participants.push(agent);
        uint256 index = _participants.length - 1;
        _indexPlusOne[agent] = index + 1;

        emit AgentRegistered(agent, operator, index, block.timestamp);
    }

    /// @notice True while registrations are still being accepted.
    function registrationOpen() external view returns (bool) {
        return block.timestamp < registrationDeadline;
    }

    /// @notice Seconds remaining until the deadline (0 once closed).
    function timeUntilDeadline() external view returns (uint256) {
        if (block.timestamp >= registrationDeadline) return 0;
        return registrationDeadline - block.timestamp;
    }

    /// @notice Number of registered agents.
    function participantCount() external view returns (uint256) {
        return _participants.length;
    }

    /// @notice Agent address at a given 0-based index.
    function participantAt(uint256 index) external view returns (address) {
        return _participants[index];
    }

    /// @notice The agent's 0-based registration index. Reverts if not registered.
    function indexOf(address agent) external view returns (uint256) {
        uint256 i = _indexPlusOne[agent];
        require(i != 0, "not registered");
        return i - 1;
    }

    /// @notice The full, immutable participant list.
    function getParticipants() external view returns (address[] memory) {
        return _participants;
    }
}
