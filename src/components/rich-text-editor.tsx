"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

const tools = [
  { label: "Bold", run: (e: any) => e.chain().focus().toggleBold().run(), active: (e: any) => e.isActive("bold") },
  { label: "Italic", run: (e: any) => e.chain().focus().toggleItalic().run(), active: (e: any) => e.isActive("italic") },
  { label: "Heading", run: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e: any) => e.isActive("heading") },
  { label: "Bullets", run: (e: any) => e.chain().focus().toggleBulletList().run(), active: (e: any) => e.isActive("bulletList") },
  { label: "Quote", run: (e: any) => e.chain().focus().toggleBlockquote().run(), active: (e: any) => e.isActive("blockquote") },
];

/** Menulis HTML ke <input type="hidden" name={name}>; server menyanitasi sebelum disimpan. */
export function RichTextEditor({ name, initial = "" }: { name: string; initial?: string }) {
  const [html, setHtml] = useState(initial);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, horizontalRule: false })],
    content: initial,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: { attributes: { class: "prose-estate min-h-[220px] px-4 py-3 text-sm focus:outline-none", "aria-label": "Description" } },
  });
  return (
    <div className="border border-basalt/25">
      <div className="flex flex-wrap gap-1 border-b border-basalt/15 p-1">
        {tools.map((t) => (
          <button key={t.label} type="button" onClick={() => editor && t.run(editor)} aria-pressed={editor ? t.active(editor) : false}
            className="px-3 py-1.5 text-xs hover:bg-stone aria-pressed:bg-basalt aria-pressed:text-paper">{t.label}</button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
