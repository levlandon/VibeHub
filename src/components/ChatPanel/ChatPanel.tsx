import { useEffect, useRef, useState } from "react";
import { CHAT_CHANNELS } from "../../data/chat";
import { formatDateTime } from "../../lib/datetime";
import { RichText } from "../mentions/RichText";
import { MentionField } from "../mentions/MentionField";
import { useHub } from "../../state/HubContext";
import type { ChatMessage, EntityRef } from "../../types/hub";
import { IconBookmark, IconChevron, IconClose, IconPlus, IconReply, IconSend } from "../icons";
import styles from "./ChatPanel.module.css";

export function ChatPanel() {
  const { mentionEntities, chatChannel, setChatChannel, messages, sendMessage, setChatOpen } =
    useHub();
  const channel = CHAT_CHANNELS.find((c) => c.id === chatChannel)!;
  const list = messages.filter((m) => m.channelId === chatChannel);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [list.length, chatChannel]);

  return (
    <aside className={styles.panel} aria-label="Чат сообщества">
      <header className={styles.header}>
        <ChannelMenu label={channel.label} current={chatChannel} onChange={setChatChannel} />
        <button
          type="button"
          className={styles.iconBtn}
          title="Свернуть чат"
          aria-label="Свернуть чат"
          onClick={() => setChatOpen(false)}
        >
          <IconClose width={18} height={18} />
        </button>
      </header>

      <div className={styles.thread} ref={scroller}>
        {list.length === 0 ? (
          <div className={styles.emptyThread}>
            <p>Сообщений в #{channel.label} пока нет.</p>
            <p className={styles.emptyHint}>
              Напишите первое сообщение или упомяните модель через @.
            </p>
          </div>
        ) : (
          list.map((message) => (
            <ChatRow key={message.id} message={message} entities={mentionEntities} />
          ))
        )}
      </div>

      <Composer onSend={sendMessage} />
    </aside>
  );
}

function ChannelMenu({
  label,
  current,
  onChange,
}: {
  label: string;
  current: string;
  onChange: (id: (typeof CHAT_CHANNELS)[number]["id"]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.channelWrap}>
      <button
        type="button"
        className={styles.channel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>#{label}</span>
        <IconChevron width={16} height={16} className={styles.chevron} />
      </button>
      {open ? (
        <div className={styles.menu} role="listbox">
          {CHAT_CHANNELS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === current ? styles.menuActive : undefined}
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
            >
              #{item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChatRow({ message, entities }: { message: ChatMessage; entities: EntityRef[] }) {
  const { setRoute } = useHub();
  return (
    <article className={styles.msg}>
      <span className={styles.avatar} aria-hidden>
        {message.author.initials}
      </span>
      <div className={styles.msgBody}>
        <p className={styles.meta}>
          <button
            type="button"
            className={styles.authorBtn}
            onClick={() => setRoute("profile")}
            title="Открыть профиль автора"
          >
            {message.author.name}
          </button>
          <time>{formatDateTime(message.createdAt)}</time>
        </p>
        <p className={styles.bubble}>
          <RichText text={message.text} spans={message.spans} entities={entities} />
        </p>
      </div>
      <div className={styles.hover}>
        <button type="button" title="Ответить" aria-label="Ответить">
          <IconReply width={15} height={15} />
        </button>
        <button type="button" title="Сохранить" aria-label="Сохранить">
          <IconBookmark width={15} height={15} />
        </button>
      </div>
    </article>
  );
}

function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState("");
  const send = () => {
    onSend(value);
    setValue("");
  };

  return (
    <div className={styles.composerWrap}>
      <div className={styles.composer}>
        <MentionField
          rows={2}
          value={value}
          onChange={setValue}
          placeholder="Написать сообщение..."
          onSubmit={send}
        />
        <div className={styles.composerBar}>
          <button type="button" className={styles.plus} title="Вложение (скоро)">
            <IconPlus width={18} height={18} />
          </button>
          <button
            type="button"
            className={styles.send}
            title="Отправить"
            aria-label="Отправить"
            disabled={!value.trim()}
            onClick={send}
          >
            <IconSend width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

