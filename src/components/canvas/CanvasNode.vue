<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { Asset } from '@/api/types'

const props = defineProps<{
  id: string
  type: string
  data: {
    asset?: Asset
    text?: string
    caption?: string
    pending?: boolean
    readonly?: boolean
    onInput?: (text: string) => void
    onPick?: () => void
  }
  selected?: boolean
}>()

const LABEL: Record<string, string> = {
  input: 'Input 图',
  prompt: 'Prompt 节点',
  output: 'Output 图',
  feedback: '反馈 / 备注',
}

function onText(e: Event) {
  props.data.onInput?.((e.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div class="cnode" :class="[type, { sel: selected }]">
    <Handle v-if="type !== 'input'" type="target" :position="Position.Left" />
    <div class="nt">
      <span class="nt-dot" />{{ data.caption || LABEL[type] }}
    </div>

    <template v-if="type === 'input' || type === 'output'">
      <div v-if="data.pending" class="pic pending"><span class="spin" />生成中…</div>
      <div v-else-if="data.asset" class="pic" :style='{ backgroundImage: `url("${data.asset.thumbnailUrl}")` }' />
      <button v-else-if="!data.readonly" class="pic pick" @click="data.onPick?.()" @mousedown.stop>＋ 选择素材</button>
      <div v-else class="pic empty" />
      <div class="txt">
        {{ data.asset ? (data.asset.prompt ? data.asset.modelName : '生成结果') : (data.caption || (type === 'input' ? '参考图' : '设计稿')) }}
      </div>
    </template>

    <template v-else-if="type === 'prompt'">
      <textarea
        v-if="!data.readonly"
        class="prompt-edit"
        :value="data.text"
        rows="4"
        placeholder="描述生成意图…"
        @input="onText"
        @mousedown.stop
        @dblclick.stop
      />
      <div v-else class="txt prompt-ro">{{ data.text || '（空 Prompt）' }}</div>
    </template>

    <template v-else>
      <textarea
        v-if="!data.readonly"
        class="prompt-edit"
        :value="data.text"
        rows="3"
        placeholder="备注 / 反馈…"
        @input="onText"
        @mousedown.stop
        @dblclick.stop
      />
      <div v-else class="txt">{{ data.text }}</div>
    </template>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.cnode {
  width: 158px;
  background: var(--node-bg);
  border: 1.5px solid var(--line-2);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 11px;
  font-family: var(--font-body);
}
.cnode.sel {
  border-color: var(--primary);
  box-shadow: var(--glow), var(--shadow);
}
.nt {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.nt-dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: var(--muted);
}
.input .nt-dot { background: var(--primary); }
.prompt .nt-dot { background: var(--accent); }
.output .nt-dot { background: var(--success); }
.feedback .nt-dot { background: var(--warn); }
.pic {
  height: 66px;
  border-radius: 8px;
  border: 1px solid var(--line);
  margin-bottom: 7px;
  background-size: cover;
  background-position: center;
}
.pic.pending {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  background: var(--bg-2);
}
.pic.pick {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  background: var(--bg-2);
  border: 1px dashed var(--line-2);
  cursor: pointer;
}
.pic.pick:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.pic.empty {
  background: var(--bg-2);
}
.spin {
  width: 13px;
  height: 13px;
  border: 2px solid var(--line-2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.txt {
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--ink-2);
}
.cnode.prompt {
  width: 212px;
  border-color: var(--accent);
}
.cnode.feedback {
  width: 196px;
  background: var(--warn-soft);
  border-color: color-mix(in srgb, var(--warn) 40%, transparent);
}
.prompt-edit {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg-2);
  color: var(--ink);
  font: inherit;
  font-size: 11.5px;
  line-height: 1.45;
  padding: 7px 8px;
  resize: none;
  outline: none;
}
.prompt-edit:focus {
  border-color: var(--accent);
}
.prompt-ro {
  white-space: pre-wrap;
}
:deep(.vue-flow__handle) {
  width: 9px;
  height: 9px;
  background: var(--panel);
  border: 2px solid var(--primary);
}
</style>
