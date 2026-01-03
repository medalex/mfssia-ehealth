// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import '@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol';
import '@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol';

/**
 * @title MfssiaOracleConsumer
 * @notice Chainlink Functions consumer for MFSSIA batch verification of challenge instances
 * @dev Supports A, B, C, D challenge sets with bitmask + confidence aggregation
 *      Stores pending requests and emits structured events for off-chain processing
 */
contract MfssiaOracleConsumer is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    FunctionsClient
{
    using FunctionsRequest for FunctionsRequest.Request;

    // ================== STATE VARIABLES ==================
    
    /// @notice Chainlink Functions Decentralized Oracle Network ID
    bytes32 public donId;

    /// @notice JavaScript code for batch verification (full MFSSIA verifier)
    string public batchVerificationLogic;

    /// @notice Pending verifications: requestId → instanceKey (keccak256(subjectDid + instanceId))
    mapping(bytes32 => bytes32) public pendingVerifications;

    // ================== EVENTS ==================

    /// @notice Fired when a verification request is submitted
    event VerificationRequested(
        bytes32 indexed requestId,
        bytes32 indexed instanceKey,
        string challengeSet,
        address indexed requester
    );

    /// @notice Fired when the Chainlink Functions response is received
    /// @dev `response` is JSON string encoded as bytes
    ///      Example: {"v":1,"r":1,"c":9850,"m":"0x0000..."} 
    ///      - v: version
    ///      - r: overall pass (1=PASS,0=FAIL)
    ///      - c: aggregate confidence ×10000
    ///      - m: bitmask of passed challenges
    /// @param err contains execution errors if any
    event VerificationResponseReceived(
        bytes32 indexed requestId,
        bytes32 indexed instanceKey,
        bytes response,
        bytes err
    );

    /// @notice Fired if the oracle execution fails
    event VerificationFailed(
        bytes32 indexed requestId,
        bytes32 indexed instanceKey,
        string reason
    );

    // ================== CONSTRUCTOR ==================

    constructor(address router) FunctionsClient(router) {}

    // ================== INITIALIZER ==================

    /**
     * @notice Initialize contract via proxy
     * @param _donId Chainlink Functions DON ID
     * @param _batchVerificationLogic Full JavaScript verifier source
     */
    function initialize(
        bytes32 _donId,
        string calldata _batchVerificationLogic
    ) external initializer {
        donId = _donId;
        batchVerificationLogic = _batchVerificationLogic;

        __Ownable_init(msg.sender); // Set contract owner
    }

    // ================== VERIFICATION REQUEST ==================

    /**
     * @notice Trigger batch verification for a challenge instance
     * @param instanceKey keccak256(subjectDid + instanceId)
     * @param challengeSet Code of the challenge set (e.g., "mfssia:Example-D")
     * @param args Array of arguments for JS verifier
     *             [0]=evidences JSON
     *             [1]=mandatory IDs JSON
     *             [2]=optional IDs JSON
     *             [3]=aggregation rule
     *             [4]=confidence threshold
     *             [5]=min challenges
     * @param subscriptionId Chainlink Functions subscription ID
     * @param gasLimit Gas limit for callback execution
     * @return requestId The Chainlink Functions request ID
     */
    function requestVerification(
        bytes32 instanceKey,
        string calldata challengeSet,
        string[] calldata args,
        uint64 subscriptionId,
        uint32 gasLimit
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequest(
            FunctionsRequest.Location.Inline,
            FunctionsRequest.CodeLanguage.JavaScript,
            batchVerificationLogic
        );

        if (args.length > 0) {
            req.setArgs(args);
        }

        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        pendingVerifications[requestId] = instanceKey;

        emit VerificationRequested(
            requestId,
            instanceKey,
            challengeSet,
            msg.sender
        );
    }

    // ================== FULFILLMENT ==================

    /**
     * @notice Chainlink Functions fulfillment callback
     * @param requestId ID of the verification request
     * @param response JSON string bytes from the JS verifier
     *                 Example: {"v":1,"r":1,"c":9850,"m":"0x0000..."}
     * @param err Execution error bytes if JS failed
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        bytes32 instanceKey = pendingVerifications[requestId];

        emit VerificationResponseReceived(requestId, instanceKey, response, err);

        if (instanceKey == bytes32(0)) return; // Unknown request

        if (err.length > 0) {
            emit VerificationFailed(requestId, instanceKey, "Oracle execution error");
        }

        // Do NOT delete pendingVerifications here
        // Backend confirms fulfillment and allows replay protection
    }

    // ================== ADMIN FUNCTIONS ==================

    /**
     * @notice Clear a pending verification manually
     * @param requestId ID of the request to remove
     */
    function clearPending(bytes32 requestId) external onlyOwner {
        require(pendingVerifications[requestId] != bytes32(0), "No pending request");
        delete pendingVerifications[requestId];
    }

    // ================== UPGRADE AUTHORIZATION ==================

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
