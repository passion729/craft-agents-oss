import { describe, expect, it } from 'bun:test'
import { handleComplete, handleError, handleTypedError } from '../session'
import type { ErrorEvent, CompleteEvent, SessionState, TypedErrorEvent } from '../../types'

function makeState(messages: any[]): SessionState {
  return {
    session: {
      id: 'session-1',
      messages,
      lastMessageAt: Date.now(),
      isProcessing: true,
    } as any,
    streaming: null,
  }
}

describe('terminal user message state cleanup', () => {
  it('clears pending and queued user flags when a turn completes', () => {
    const state = makeState([
      { id: 'msg-1', role: 'user', content: 'pending', isPending: true },
      { id: 'msg-2', role: 'user', content: 'queued', isPending: true, isQueued: true },
      { id: 'tool-1', role: 'tool', toolStatus: 'executing', toolResult: undefined },
    ])

    const event: CompleteEvent = {
      type: 'complete',
      sessionId: 'session-1',
    }

    const next = handleComplete(state, event)
    const messages = next.state.session.messages as any[]
    const pendingUser = messages.find(m => m.id === 'msg-1')
    const queuedUser = messages.find(m => m.id === 'msg-2')
    const tool = messages.find(m => m.id === 'tool-1')

    expect(pendingUser.isPending).toBe(false)
    expect(queuedUser.isPending).toBe(false)
    expect(queuedUser.isQueued).toBe(false)
    expect(tool.toolStatus).toBe('completed')
  })

  it('clears pending and queued user flags before appending a plain error', () => {
    const state = makeState([
      { id: 'msg-1', role: 'user', content: 'failed turn', isPending: true, isQueued: true },
    ])

    const event: ErrorEvent = {
      type: 'error',
      sessionId: 'session-1',
      error: 'boom',
    }

    const next = handleError(state, event)
    const user = next.state.session.messages.find(m => m.id === 'msg-1') as any

    expect(user.isPending).toBe(false)
    expect(user.isQueued).toBe(false)
    expect(next.state.session.messages.at(-1)?.role).toBe('error')
  })

  it('clears pending and queued user flags before appending a typed error', () => {
    const state = makeState([
      { id: 'msg-1', role: 'user', content: 'failed typed turn', isPending: true, isQueued: true },
    ])

    const event: TypedErrorEvent = {
      type: 'typed_error',
      sessionId: 'session-1',
      error: {
        code: 'unknown_error',
        title: 'Error',
        message: 'typed boom',
        actions: [],
        canRetry: false,
      },
    }

    const next = handleTypedError(state, event)
    const user = next.state.session.messages.find(m => m.id === 'msg-1') as any

    expect(user.isPending).toBe(false)
    expect(user.isQueued).toBe(false)
    expect(next.state.session.messages.at(-1)?.role).toBe('error')
  })
})
