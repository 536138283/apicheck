import { workerConfig } from "@/uptime.config";
import { MonitorState } from "@/uptime.types";
import { createLocalPreviewState } from "@/util/localPreviewState";
import { getLatencyHealth, isIncidentOpen } from "@/util/health";
import { NextRequest } from "next/server";

export const runtime = 'edge'

export default async function handler(req: NextRequest): Promise<Response> {

  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  let stateStr = await UPTIMEFLARE_STATE?.get('state')
  if (!stateStr && process.env.NODE_ENV === 'development') {
    stateStr = JSON.stringify(createLocalPreviewState(workerConfig.monitors))
  }

  if (!stateStr) {
    return new Response(JSON.stringify({ error: '暂无监控数据' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
  const state = (JSON.parse(stateStr)) as unknown as MonitorState

  let monitors: any = {}

  for (let monitor of workerConfig.monitors) {
    const incidents = state.incident[monitor.id]
    const latency = state.latency[monitor.id]

    if (!incidents?.length || !latency?.recent?.length) {
      monitors[monitor.id] = {
        up: false,
        latency: null,
        location: null,
        message: '暂无状态记录',
      }
      continue
    }

    const latestLatency = latency.recent.slice(-1)[0]
    const currentHealth = getLatencyHealth(latestLatency.ping, isIncidentOpen(incidents))
    monitors[monitor.id] = {
      up: currentHealth.severity < 2,
      latency: latestLatency.ping,
      location: latestLatency.loc,
      message: currentHealth.severity < 2 ? currentHealth.label : incidents.slice(-1)[0].error.slice(-1)[0]
    }
  }

  const monitorValues = Object.values(monitors) as { up: boolean }[]
  let ret = {
    up: monitorValues.filter((monitor) => monitor.up).length,
    down: monitorValues.filter((monitor) => !monitor.up).length,
    updatedAt: state.lastUpdate,
    monitors: monitors
  }

  return new Response(JSON.stringify(ret), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
