import { useImperativeHandle, useRef, MutableRefObject, useEffect } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { EditorProps } from "@tiptap/pm/view";
import { useEditor as useCustomEditor, Editor } from "@tiptap/react";
import * as Y from "yjs";
// extensions
import { CoreReadOnlyEditorExtensions } from "@/extensions";
// helpers
import { getParagraphCount } from "@/helpers/common";
import { IMarking, scrollSummary } from "@/helpers/scroll-to-node";
// props
import { CoreReadOnlyEditorProps } from "@/props";
// types
import { EditorReadOnlyRefApi, IMentionHighlight } from "@/types";

interface CustomReadOnlyEditorProps {
  initialValue?: string;
  editorClassName: string;
  forwardedRef?: MutableRefObject<EditorReadOnlyRefApi | null>;
  extensions?: any;
  editorProps?: EditorProps;
  handleEditorReady?: (value: boolean) => void;
  mentionHandler: {
    highlights: () => Promise<IMentionHighlight[]>;
  };
  provider?: HocuspocusProvider;
}

export const useReadOnlyEditor = (props: CustomReadOnlyEditorProps) => {
  const {
    initialValue,
    editorClassName,
    forwardedRef,
    extensions = [],
    editorProps = {},
    handleEditorReady,
    mentionHandler,
    provider,
  } = props;

  const editor = useCustomEditor({
    editable: false,
    content: typeof initialValue === "string" && initialValue.trim() !== "" ? initialValue : "<p></p>",
    editorProps: {
      ...CoreReadOnlyEditorProps({
        editorClassName,
      }),
      ...editorProps,
    },
    onCreate: async () => {
      handleEditorReady?.(true);
    },
    extensions: [
      ...CoreReadOnlyEditorExtensions({
        mentionHighlights: mentionHandler.highlights,
      }),
      ...extensions,
    ],
    onDestroy: () => {
      handleEditorReady?.(false);
    },
  });

  // for syncing swr data on tab refocus etc
  useEffect(() => {
    if (initialValue === null || initialValue === undefined) return;
    if (editor && !editor.isDestroyed) editor?.commands.setContent(initialValue, false, { preserveWhitespace: "full" });
  }, [editor, initialValue]);

  const editorRef: MutableRefObject<Editor | null> = useRef(null);

  useImperativeHandle(forwardedRef, () => ({
    clearEditor: () => {
      editorRef.current?.commands.clearContent();
    },
    setEditorValue: (content: string) => {
      editorRef.current?.commands.setContent(content, false, { preserveWhitespace: "full" });
    },
    getMarkDown: (): string => {
      const markdownOutput = editorRef.current?.storage.markdown.getMarkdown();
      return markdownOutput;
    },
    getDocument: () => {
      const documentBinary = provider?.document ? Y.encodeStateAsUpdate(provider?.document) : null;
      const documentHTML = editorRef.current?.getHTML() ?? "<p></p>";
      const documentJSON = editorRef.current?.getJSON() ?? null;

      return {
        binary: documentBinary,
        html: documentHTML,
        json: documentJSON,
      };
    },
    scrollSummary: (marking: IMarking): void => {
      if (!editorRef.current) return;
      scrollSummary(editorRef.current, marking);
    },
    getDocumentInfo: () => {
      return {
        characters: editorRef?.current?.storage?.characterCount?.characters?.() ?? 0,
        paragraphs: getParagraphCount(editorRef?.current?.state),
        words: editorRef?.current?.storage?.characterCount?.words?.() ?? 0,
      };
    },
    onHeadingChange: (callback: (headings: IMarking[]) => void) => {
      // Subscribe to update event emitted from headers extension
      editorRef.current?.on("update", () => {
        callback(editorRef.current?.storage.headingList.headings);
      });
      // Return a function to unsubscribe to the continuous transactions of
      // the editor on unmounting the component that has subscribed to this
      // method
      return () => {
        editorRef.current?.off("update");
      };
    },
    getHeadings: () => {
      return editorRef?.current?.storage.headingList.headings;
    },
  }));

  if (!editor) {
    return null;
  }

  editorRef.current = editor;
  return editor;
};
