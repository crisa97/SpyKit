import { describe, it, expect, beforeEach } from 'vitest';
import { handleWSMessage, getWSConnections, clearWSConnections, WSConnectionsToHtml } from '../src/network/websocket';

describe('WebSocket Capture', () => {
  beforeEach(() => {
    clearWSConnections();
  });

  it('adds new connection on open event', () => {
    handleWSMessage({ wsType: 'open', wsId: 'ws_1', url: 'wss://example.com/ws', timestamp: 1000 });
    const conns = getWSConnections();
    expect(conns).toHaveLength(1);
    expect(conns[0].url).toBe('wss://example.com/ws');
    expect(conns[0].active).toBe(true);
  });

  it('captures sent messages', () => {
    handleWSMessage({ wsType: 'open', wsId: 'ws_1', url: 'wss://example.com/ws', timestamp: 1000 });
    handleWSMessage({ wsType: 'send', wsId: 'ws_1', data: 'hello', dataLength: 5, timestamp: 1001 });
    const conns = getWSConnections();
    expect(conns).toHaveLength(1);
    expect(conns[0].messages).toHaveLength(1);
    expect(conns[0].messages[0].direction).toBe('sent');
    expect(conns[0].messages[0].data).toBe('hello');
  });

  it('captures received messages', () => {
    handleWSMessage({ wsType: 'open', wsId: 'ws_1', url: 'wss://example.com/ws', timestamp: 1000 });
    handleWSMessage({ wsType: 'message', wsId: 'ws_1', data: 'response', dataLength: 8, timestamp: 1002 });
    const conns = getWSConnections();
    expect(conns[0].messages[0].direction).toBe('received');
    expect(conns[0].messages[0].data).toBe('response');
  });

  it('marks connection closed on close event', () => {
    handleWSMessage({ wsType: 'open', wsId: 'ws_1', url: 'wss://example.com/ws', timestamp: 1000 });
    handleWSMessage({ wsType: 'close', wsId: 'ws_1', code: 1000, reason: 'Normal', timestamp: 2000 });
    const conns = getWSConnections();
    expect(conns[0].active).toBe(false);
    expect(conns[0].closed).toBe(2000);
  });

  it('categorizes message directions correctly', () => {
    handleWSMessage({ wsType: 'open', wsId: 'ws_1', url: 'wss://example.com/ws', timestamp: 1000 });
    handleWSMessage({ wsType: 'send', wsId: 'ws_1', data: 'ping', timestamp: 1001 });
    handleWSMessage({ wsType: 'message', wsId: 'ws_1', data: 'pong', timestamp: 1002 });
    handleWSMessage({ wsType: 'error', wsId: 'ws_1', timestamp: 1003 });
    const msgs = getWSConnections()[0].messages;
    expect(msgs[0].direction).toBe('sent');
    expect(msgs[1].direction).toBe('received');
    expect(msgs[2].direction).toBe('event');
  });

  it('ignores messages for unknown wsId without prior open', () => {
    handleWSMessage({ wsType: 'send', wsId: 'ws_unknown', data: 'test', timestamp: 1000 });
    expect(getWSConnections()).toHaveLength(0);
  });

  it('clearWSConnections empties all connections', () => {
    handleWSMessage({ wsType: 'open', wsId: 'ws_1', url: 'wss://a.com', timestamp: 1000 });
    handleWSMessage({ wsType: 'open', wsId: 'ws_2', url: 'wss://b.com', timestamp: 1000 });
    expect(getWSConnections()).toHaveLength(2);
    clearWSConnections();
    expect(getWSConnections()).toHaveLength(0);
  });

  it('WSConnectionsToHtml returns non-empty for connections', () => {
    handleWSMessage({ wsType: 'open', wsId: 'ws_1', url: 'wss://example.com/ws', timestamp: 1000 });
    const html = WSConnectionsToHtml();
    expect(html).toContain('example.com');
  });

  it('WSConnectionsToHtml returns fallback for no connections', () => {
    const html = WSConnectionsToHtml();
    expect(html).toContain('No WebSocket');
  });
});
