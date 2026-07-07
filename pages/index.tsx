import Head from 'next/head'
import { useEffect, useState } from 'react'

import { MonitorState, StatusPageMonitor } from '@/uptime.types'
import { KVNamespace } from '@cloudflare/workers-types'
import { pageConfig, workerConfig } from '@/uptime.config'
import OverallStatus from '@/components/OverallStatus'
import Header from '@/components/Header'
import MonitorList from '@/components/MonitorList'
import { Center, Text } from '@mantine/core'
import MonitorDetail from '@/components/MonitorDetail'
import { createLocalPreviewState } from '@/util/localPreviewState'
import classes from '@/styles/Home.module.css'

export const runtime = 'experimental-edge'
const fontFamily =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function useHashMonitorId() {
  const [monitorId, setMonitorId] = useState('')

  useEffect(() => {
    const updateMonitorId = () => {
      setMonitorId(window.location.hash.substring(1))
    }

    updateMonitorId()
    window.addEventListener('hashchange', updateMonitorId)

    return () => window.removeEventListener('hashchange', updateMonitorId)
  }, [])

  return monitorId
}

export default function Home({
  state: stateStr,
  monitors,
}: {
  state?: string | null
  monitors: StatusPageMonitor[]
}) {
  let state: MonitorState | undefined
  if (typeof stateStr === 'string' && stateStr.length > 0) {
    try {
      state = JSON.parse(stateStr) as MonitorState
    } catch {
      state = undefined
    }
  }

  // Specify monitorId in URL hash to view a specific monitor (can be used in iframe)
  const monitorId = useHashMonitorId()
  if (monitorId) {
    const monitor = monitors.find((monitor) => monitor.id === monitorId)
    if (!monitor) {
      return <Text fw={700}>未找到 ID 为 {monitorId} 的监控服务。</Text>
    }
    return (
      <main className={classes.page} style={{ fontFamily }}>
        <div className={classes.embedShell}>
          <div className={classes.detailPanel}>
            <MonitorDetail monitor={monitor} state={state} />
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <meta name="description" content={pageConfig.description} />
        <meta name="keywords" content={pageConfig.keywords.join(', ')} />
        <meta name="application-name" content={pageConfig.siteName} />
        <meta property="og:title" content={pageConfig.title} />
        <meta property="og:description" content={pageConfig.description} />
        <meta property="og:site_name" content={pageConfig.siteName} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageConfig.title} />
        <meta name="twitter:description" content={pageConfig.description} />
        <meta property="og:image" content="/icon-512.png" />
        <meta name="twitter:image" content="/icon-512.png" />
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate, proxy-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </Head>

      <main className={classes.page} style={{ fontFamily }}>
        <Header />

        <div className={classes.content}>
          <section className={classes.statusPanel}>
            {state === undefined ? (
              <Center className={classes.emptyState}>
                <Text fw={700}>
                  当前没有监控状态数据，请等待定时检查完成后刷新页面。
                </Text>
              </Center>
            ) : (
              <OverallStatus state={state} monitors={monitors} />
            )}
          </section>
          <MonitorList monitors={monitors} state={state} />
        </div>

        <Text component="footer" className={classes.footer} size="xs">
          © 2026 竹梦（天津）科技有限公司 · 基于{' '}
          <a href="https://github.com/amclubs/am-uptime-flare" target="_blank" rel="noreferrer">
            UptimeFlare
          </a>{' '}
          与{' '}
          <a href="https://www.cloudflare.com/" target="_blank" rel="noreferrer">
            Cloudflare
          </a>
          {' '}构建。
        </Text>
      </main>
    </>
  )
}

export async function getServerSideProps() {
  const { UPTIMEFLARE_STATE } = process.env as unknown as {
    UPTIMEFLARE_STATE: KVNamespace
  }

  // Read state as string from KV, to avoid hitting server-side cpu time limit
  let state = (await UPTIMEFLARE_STATE?.get('state')) as unknown as string | null | undefined

  // Only present these values to client
  const monitors: StatusPageMonitor[] = workerConfig.monitors.map((monitor) => {
    return {
      id: monitor.id,
      name: monitor.name,
      statusPageLink: monitor?.statusPageLink,
    }
  })

  if (!state && process.env.NODE_ENV === 'development') {
    state = JSON.stringify(createLocalPreviewState(monitors))
  }

  return { props: { state, monitors } }
}
