import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Minus,
  Hash,
} from 'lucide-react';
import { markdownToHtml, htmlToMarkdown } from '../utils/markdownHelper';
import { setEditorContentWidth } from '../utils/visualLines';

interface EditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onSelectText?: (text: string) => void;
}

interface GutterLine {
  num: number;
  top: number;
  height: number;
}

export const Editor: React.FC<EditorProps> = ({
  initialMarkdown,
  onChange,
  onSelectText,
}) => {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [gutterLines, setGutterLines] = useState<GutterLine[]>([]);
  const isInternalUpdate = useRef(false);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const calculateGutterLines = () => {
    if (!editorWrapperRef.current) return;
    const wrapper = editorWrapperRef.current;
    const proseMirror = wrapper.querySelector('.ProseMirror') as HTMLElement | null;
    if (!proseMirror) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    setEditorContentWidth(proseMirror.clientWidth);
    const blocks = proseMirror.children;
    const newLines: GutterLine[] = [];
    let currentParagraphNum = 1;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i] as HTMLElement;
      if (!block) continue;

      const subItems =
        block.tagName === 'UL' || block.tagName === 'OL'
          ? (Array.from(block.children) as HTMLElement[])
          : [block];

      for (const item of subItems) {
        const itemRect = item.getBoundingClientRect();
        newLines.push({
          num: currentParagraphNum++,
          top: itemRect.top - wrapperRect.top,
          height: itemRect.height || 28,
        });
      }
    }

    setGutterLines(newLines);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Begin your story or article here... Press "/" for commands.',
      }),
    ],
    content: markdownToHtml(initialMarkdown),
    editorProps: {
      attributes: {
        class:
          'prose max-w-none focus:outline-none min-h-[500px] leading-relaxed font-serif text-lg tracking-normal',
      },
    },
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
      requestAnimationFrame(calculateGutterLines);
      setTimeout(() => {
        isInternalUpdate.current = false;
      }, 50);
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelectText) {
        const { from, to } = editor.state.selection;
        const selected = editor.state.doc.textBetween(from, to, ' ');
        onSelectText(selected);
      }
    },
  });

  // Handle external updates (document switch, version restore, diff merge)
  useEffect(() => {
    if (editor && !isInternalUpdate.current) {
      const currentMd = htmlToMarkdown(editor.getHTML());
      if (currentMd.trim() !== initialMarkdown.trim()) {
        const newHtml = markdownToHtml(initialMarkdown);
        editor.commands.setContent(newHtml, false);
        requestAnimationFrame(calculateGutterLines);
      }
    }
  }, [initialMarkdown, editor]);

  // Recalculate gutter positions on mount, resize, and content changes
  useEffect(() => {
    let animId: number;
    const scheduleUpdate = () => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(calculateGutterLines);
    };

    scheduleUpdate();

    const wrapper = editorWrapperRef.current;
    if (wrapper) {
      const observer = new ResizeObserver(scheduleUpdate);
      observer.observe(wrapper);
      window.addEventListener('resize', scheduleUpdate);

      // Multiple deferred recalculations to accommodate font/layout settling
      const t1 = setTimeout(scheduleUpdate, 100);
      const t2 = setTimeout(scheduleUpdate, 300);

      return () => {
        cancelAnimationFrame(animId);
        observer.disconnect();
        window.removeEventListener('resize', scheduleUpdate);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [editor, initialMarkdown, showLineNumbers]);

  if (!editor) {
    return <div className="p-8 text-theme-muted">Loading editor...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-theme-editor-bg border border-theme-border rounded-xl overflow-hidden shadow-md">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 bg-theme-surface border-b border-theme-border select-none">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('bold')
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('italic')
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('strike')
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-theme-border mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-theme-border mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('bulletList')
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('orderedList')
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('blockquote')
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 rounded transition ${
            editor.isActive('codeBlock')
              ? 'bg-theme-accent text-theme-accent-text shadow-sm'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition"
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-theme-border mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition disabled:opacity-30 disabled:hover:bg-transparent"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition disabled:opacity-30 disabled:hover:bg-transparent"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-theme-border mx-1" />

        {/* Paragraph Numbers Toggle */}
        <button
          type="button"
          onClick={() => setShowLineNumbers(!showLineNumbers)}
          className={`p-1.5 rounded transition flex items-center gap-1.5 text-xs ${
            showLineNumbers
              ? 'bg-theme-accent text-theme-accent-text shadow-sm font-semibold'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
          }`}
          title={showLineNumbers ? 'Hide Paragraph Numbers' : 'Show Paragraph Numbers'}
        >
          <Hash className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">Paragraphs</span>
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-theme-editor-bg">
        <div className="max-w-4xl mx-auto flex items-start relative min-h-[500px]">
          {/* Gutter Column */}
          {showLineNumbers && (
            <div
              className="w-10 sm:w-12 select-none border-r border-theme-border pr-2.5 mr-4 text-right shrink-0 relative pointer-events-none"
              style={{
                height: editorWrapperRef.current?.offsetHeight
                  ? `${editorWrapperRef.current.offsetHeight}px`
                  : '100%',
              }}
            >
              {gutterLines.map((line) => (
                <div
                  key={line.num}
                  className="absolute right-2.5 line-gutter-number leading-normal"
                  style={{ top: `${Math.round(line.top + 2)}px` }}
                >
                  {line.num}
                </div>
              ))}
            </div>
          )}

          {/* Editor Prose Content */}
          <div className="flex-1 min-w-0" ref={editorWrapperRef}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
};
