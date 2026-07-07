export type HealthLabel = '正常' | '降级' | '错误'

export type HealthStatus = {
  label: HealthLabel
  color: string
  severity: 0 | 1 | 2
}

const HEALTH_THRESHOLDS = {
  okMaxMs: 3000,
  degradedMaxMs: 10000,
} as const

const HEALTH_STATUS = {
  normal: { label: '正常', color: '#059669', severity: 0 },
  degraded: { label: '降级', color: '#d97706', severity: 1 },
  error: { label: '错误', color: '#b91c1c', severity: 2 },
} as const satisfies Record<string, HealthStatus>

function getLatencyHealth(ping: number | null | undefined, isError = false): HealthStatus {
  if (isError || ping === undefined || ping === null || !Number.isFinite(ping)) {
    return HEALTH_STATUS.error
  }

  if (ping <= HEALTH_THRESHOLDS.okMaxMs) {
    return HEALTH_STATUS.normal
  }

  if (ping <= HEALTH_THRESHOLDS.degradedMaxMs) {
    return HEALTH_STATUS.degraded
  }

  return HEALTH_STATUS.error
}

function isIncidentOpen(incidents: { end: number | undefined }[] | undefined) {
  return incidents?.slice(-1)[0]?.end === undefined
}

function isDuringIncident(
  time: number,
  incidents: { start: number[]; end: number | undefined }[] | undefined,
  fallbackEnd: number
) {
  return (
    incidents?.some((incident) => {
      const incidentStart = incident.start[0]
      const incidentEnd = incident.end ?? fallbackEnd
      return time >= incidentStart && time <= incidentEnd
    }) ?? false
  )
}

export { HEALTH_STATUS, HEALTH_THRESHOLDS, getLatencyHealth, isDuringIncident, isIncidentOpen }
