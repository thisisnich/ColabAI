'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Create a unique ID for each conclusion input
const createId = () => `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Form to create a conclusion
interface ConclusionFormProps {
  onSubmit: (conclusions: { text: string; tags: string[] }[]) => Promise<boolean>;
  onCancel?: () => void;
  existingConclusion?: {
    conclusions: { text: string; tags: string[] }[];
  } | null;
}

interface ConclusionInput {
  id: string;
  text: string;
  tag: string; // Only one tag per conclusion
}

export function ConclusionForm({ onSubmit, onCancel, existingConclusion }: ConclusionFormProps) {
  const [conclusions, setConclusions] = useState<ConclusionInput[]>([
    { id: createId(), text: '', tag: 'task' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Register input ref
  const registerInputRef = useCallback(
    (id: string) => (el: HTMLInputElement | null) => {
      inputRefs.current[id] = el;
    },
    []
  );

  // Load existing conclusion data if available
  useEffect(() => {
    if (existingConclusion?.conclusions && existingConclusion.conclusions.length > 0) {
      setConclusions(
        existingConclusion.conclusions.map((c) => ({
          id: createId(),
          text: c.text,
          tag: c.tags[0] || 'task',
        }))
      );
    }
  }, [existingConclusion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty conclusions
    const validConclusions = conclusions
      .filter((c) => c.text.trim().length > 0)
      .map(({ text, tag }) => ({ text, tags: [tag] }));
    if (validConclusions.length === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(validConclusions);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addConclusion = () => {
    const newId = createId();
    setConclusions([...conclusions, { id: newId, text: '', tag: 'task' }]);

    // Scroll to bottom and focus on the new input after render
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      if (inputRefs.current[newId]) {
        inputRefs.current[newId]?.focus();
      }
    }, 0);
  };

  const removeConclusion = (id: string) => {
    const newConclusions = conclusions.filter((c) => c.id !== id);
    if (newConclusions.length === 0) {
      newConclusions.push({ id: createId(), text: '', tag: 'task' });
    }
    setConclusions(newConclusions);
  };

  const handleTextChange = (id: string, value: string) => {
    setConclusions(conclusions.map((c) => (c.id === id ? { ...c, text: value } : c)));
  };

  const handleTagChange = (id: string, value: string) => {
    setConclusions(conclusions.map((c) => (c.id === id ? { ...c, tag: value } : c)));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
      <div ref={containerRef} className="max-h-[300px] overflow-y-auto pr-1">
        {conclusions.map((conclusion) => (
          <div key={conclusion.id} className="flex items-center gap-2 p-2 relative">
            <Input
              type="text"
              placeholder="Enter a conclusion"
              value={conclusion.text}
              onChange={(e) => handleTextChange(conclusion.id, e.target.value)}
              disabled={isSubmitting}
              className="flex-1 h-8"
              maxLength={200}
              ref={registerInputRef(conclusion.id)}
            />
            <Select
              value={conclusion.tag}
              onValueChange={(val: string) => handleTagChange(conclusion.id, val)}
            >
              <SelectTrigger className="w-[110px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="decision">Decision</SelectItem>
                <SelectItem value="action">Action</SelectItem>
              </SelectContent>
            </Select>
            {conclusions.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-background"
                onClick={() => removeConclusion(conclusion.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={addConclusion}>
        <Plus className="h-4 w-4 mr-2" /> Add Another Conclusion
      </Button>

      <div className="flex justify-end space-x-2 mt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !conclusions.some((c) => c.text.trim())}
          variant="default"
        >
          {isSubmitting ? 'Concluding...' : 'Conclude Discussion'}
        </Button>
      </div>
    </form>
  );
}
