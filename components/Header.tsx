import { Container, Group } from '@mantine/core'
import Image from 'next/image'
import classes from '@/styles/Header.module.css'
import { pageConfig } from '@/uptime.config'

export default function Header() {
  const iconElement = (
    <a
      href={pageConfig.links[0]?.link ?? '/'}
      target="_blank"
      className={classes.iconLink}
      aria-label="打开 Furry百科首页"
    >
      <Image
        src="/nav-icon.webp"
        alt="Furry百科"
        width={40}
        height={40}
        className={classes.icon}
      />
    </a>
  )

  const linkToElement = (link: { label: string; link: string; highlight?: boolean }) => {
    return (
      <a
        key={link.label}
        href={link.link}
        target="_blank"
        className={classes.link}
        data-active={link.highlight}
      >
        {link.label}
      </a>
    )
  }

  return (
    <header className={classes.header}>
      <Container size="md" className={classes.inner}>
        {iconElement}

        <Group gap={5} visibleFrom="sm" style={{ marginLeft: 'auto' }}>
          {pageConfig.links.map(linkToElement)}
        </Group>

        <Group gap={5} hiddenFrom="sm" style={{ marginLeft: 'auto' }}>
          {pageConfig.links.filter((link) => (link as any).highlight).map(linkToElement)}
        </Group>
      </Container>
    </header>
  )
}
