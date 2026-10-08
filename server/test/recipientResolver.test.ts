import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isMentioned, resolveRecipients } from '../src/services/recipientResolver.js';
import type { ConversationContext, NotificationPolicy, StoredMessage } from '../src/types.js';

const groupContext = (policy: NotificationPolicy): ConversationContext => ({
  type: 'group',
  group: {
    id: 'g1',
    name: 'Turma',
    ownerId: 'alice',
    memberIds: ['alice', 'bob', 'carol', 'dave'],
    memberLimit: 5,
    notificationPolicy: policy,
  },
});

const message = (overrides: Partial<StoredMessage> = {}): StoredMessage => ({
  id: 'm1',
  conversationId: 'g1',
  conversationType: 'group',
  senderId: 'alice',
  text: 'oi',
  target: { type: 'conversation' },
  mentionedUserIds: [],
  createdAt: 1,
  ...overrides,
});

describe('resolveRecipients', () => {
  it('conversa individual notifica apenas o outro participante', () => {
    const context: ConversationContext = { type: 'direct', conversation: { id: 'direct_a_b', participantIds: ['a', 'b'] } };
    assert.deepEqual(resolveRecipients(context, message({ senderId: 'a', conversationType: 'direct' })), ['b']);
  });

  it('all_group_messages notifica todos menos o remetente', () => {
    assert.deepEqual(resolveRecipients(groupContext('all_group_messages'), message()), ['bob', 'carol', 'dave']);
  });

  it('mentioned_members notifica somente destinatário e mencionados', () => {
    const recipients = resolveRecipients(
      groupContext('mentioned_members'),
      message({ target: { type: 'member', memberId: 'bob' }, mentionedUserIds: ['carol'] }),
    );
    assert.deepEqual(recipients.sort(), ['bob', 'carol']);
  });

  it('mentioned_members ignora não membros e o próprio remetente', () => {
    const recipients = resolveRecipients(
      groupContext('mentioned_members'),
      message({ mentionedUserIds: ['alice', 'intruso', 'dave'] }),
    );
    assert.deepEqual(recipients, ['dave']);
  });

  it('mentioned_members sem menções não notifica ninguém', () => {
    assert.deepEqual(resolveRecipients(groupContext('mentioned_members'), message()), []);
  });

  it('direct_messages_only e disabled não geram push em grupos', () => {
    assert.deepEqual(resolveRecipients(groupContext('direct_messages_only'), message({ mentionedUserIds: ['bob'] })), []);
    assert.deepEqual(resolveRecipients(groupContext('disabled'), message({ mentionedUserIds: ['bob'] })), []);
  });

  it('isMentioned reconhece destinatário explícito e menções', () => {
    const msg = message({ target: { type: 'member', memberId: 'bob' }, mentionedUserIds: ['carol'] });
    assert.equal(isMentioned(msg, 'bob'), true);
    assert.equal(isMentioned(msg, 'carol'), true);
    assert.equal(isMentioned(msg, 'dave'), false);
  });
});
