// Minimal types for the host-provided Kiro Crew modules. The dashboard supplies these
// at runtime through its import map; they are not on npm. Signatures copied from
// kirodotdev/KiroCrew website/src/app-sdk/index.ts and website/src/components/ui.tsx,
// trimmed to what this app uses.

declare module '@kirocrew/app-sdk' {
  export interface AppApi {
    raw(path: string, init?: RequestInit): Promise<Response>
    get<T = unknown>(path: string, init?: RequestInit): Promise<T>
    post<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>
    del<T = unknown>(path: string, init?: RequestInit): Promise<T>
  }
  export function useAppApi(): AppApi
  export function useNavBadge(): (count: number) => void
  export function useNotify(): (message: string, opts?: { type?: 'info' | 'success' | 'error' }) => void
  export function useAppInfo(): { name: string; version: string; active?: boolean }
}

declare module '@kirocrew/app-sdk/ui' {
  import type * as React from 'react'

  type Div = Omit<React.ComponentPropsWithoutRef<'div'>, 'dangerouslySetInnerHTML'>
  export function Card(props: Div): React.JSX.Element
  export function CardTitle(props: Omit<React.ComponentPropsWithoutRef<'h3'>, 'dangerouslySetInnerHTML'>): React.JSX.Element
  export const Btn: React.ForwardRefExoticComponent<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean; primary?: boolean } & React.RefAttributes<HTMLButtonElement>
  >
  export const Input: React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & React.RefAttributes<HTMLInputElement>>
  export function Badge(
    props: { variant: 'ok' | 'err' | 'warn' | 'aim' | 'muted'; children: React.ReactNode } & Omit<React.ComponentPropsWithoutRef<'span'>, 'children'>,
  ): React.JSX.Element
  export function StatCard(props: { label: string; value?: string | number | null; accent?: boolean; title?: string; onClick?: () => void; active?: boolean }): React.JSX.Element
  export function ContentSkeleton(props: { rows?: number }): React.JSX.Element
  export function EmptyState(props: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }): React.JSX.Element
  export function PageHeader(props: { title: React.ReactNode; subtitle?: string; actions?: React.ReactNode }): React.JSX.Element
  export interface Segment<T extends string = string> { key: T; label: string; count?: number }
  export function SegmentedControl<T extends string = string>(props: {
    segments: Segment<T>[]
    value: T
    onChange: (value: T) => void
    ariaLabel?: string
  }): React.JSX.Element
}
