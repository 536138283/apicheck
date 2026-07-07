import { MonitorState, MonitorTarget } from '@/uptime.types'

function buildRecentLatency(monitorIndex: number, now: number) {
  const points = []
  const basePing = 80 + monitorIndex * 35

  for (let i = 360; i >= 0; i--) {
    const wave = Math.sin((i + monitorIndex * 12) / 18) * 18
    const spike = i % (47 + monitorIndex * 9) === 0 ? 120 + monitorIndex * 35 : 0
    points.push({
      loc: ['HKG', 'NRT', 'SIN'][monitorIndex % 3],
      ping: Math.max(12, Math.round(basePing + wave + spike)),
      time: now - i * 120,
    })
  }

  return points
}

function buildAllLatency(monitorIndex: number, now: number) {
  const points = []
  const basePing = 85 + monitorIndex * 30

  for (let i = 90 * 24; i >= 0; i--) {
    const wave = Math.sin((i + monitorIndex * 17) / 11) * 14
    points.push({
      loc: ['HKG', 'NRT', 'SIN'][monitorIndex % 3],
      ping: Math.max(12, Math.round(basePing + wave)),
      time: now - i * 3600,
    })
  }

  return points
}

function buildIncidents(
  monitorIndex: number,
  now: number
): MonitorState['incident'][string] {
  const startTime = now - 90 * 24 * 60 * 60
  const incidents: MonitorState['incident'][string] = [
    {
      start: [startTime],
      end: startTime,
      error: ['preview'],
    },
  ]

  if (monitorIndex === 1) {
    incidents.push({
      start: [now - 3 * 24 * 60 * 60 - 1800],
      end: now - 3 * 24 * 60 * 60 - 900,
      error: ['预览：上游接口短暂超时'],
    })
  }

  if (monitorIndex === 2) {
    incidents.push({
      start: [now - 42 * 60],
      end: undefined,
      error: ['预览：备用服务健康检查失败'],
    })
  }

  return incidents
}

export function createLocalPreviewState(monitors: Pick<MonitorTarget, 'id'>[]): MonitorState {
  const now = Math.round(Date.now() / 1000)
  const state: MonitorState = {
    lastUpdate: now,
    overallUp: 0,
    overallDown: 0,
    incident: {},
    latency: {},
  }

  monitors.forEach((monitor, index) => {
    const incidents = buildIncidents(index, now)
    state.incident[monitor.id] = incidents
    state.latency[monitor.id] = {
      recent: buildRecentLatency(index, now),
      all: buildAllLatency(index, now),
    }

    const isUp = incidents.slice(-1)[0].end !== undefined
    if (isUp) {
      state.overallUp += 1
    } else {
      state.overallDown += 1
    }
  })

  return state
}
