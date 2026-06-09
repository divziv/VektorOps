/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HardwareAlertLog {
  deviceId: string;
  nodeTenantId: string;
  registerErrorCode: string;
  hexDumpValue: string;
  telemetryTimestamp: string;
}

export interface WarrantySlaContract {
  manufacturerId: string;
  assetSerialRange: string;
  expirationDate: string;
  responseTimeThresholdHours: number;
}

export interface RegisterMetadata {
  errorCode: string;
  registerName: string;
  failingBit: number;
  description: string;
  hardwareLevel: string;
  diagnosticAction: string;
}

export interface DiagnosticsPayload {
  alert: HardwareAlertLog;
  matchedRegister: RegisterMetadata;
  slaMatched: WarrantySlaContract;
  complianceStatus: string;
  processingTimeMs: number;
  exceptionThrown?: string;
}

export interface SimulatorState {
  activeTenant: string;
  autoStream: boolean;
  streamSpeedMs: number;
  logs: HardwareAlertLog[];
  processedLogs: DiagnosticsPayload[];
  activeLogIndex: number | null;
  securityViolations: number;
  consoleTraces: string[];
}
