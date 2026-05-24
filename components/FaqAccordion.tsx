"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export type FaqItem = {
  question: string;
  answer: string;
};

interface FaqAccordionProps {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className="flex flex-col gap-4">
      {items?.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={index}
            className={`border rounded-2xl overflow-hidden transition-colors duration-300 cursor-pointer ${isOpen
              ? 'border-app-border-default bg-app-surface-glass-soft'
              : 'border-app-border-subtle bg-app-surface-glass-faint hover:border-app-border-default hover:bg-app-surface-glass-soft'
              }`}
            onClick={() => setOpenIndex(isOpen ? -1 : index)}
          >
            <div className="flex items-center justify-between p-5 md:p-6 select-none">
              <div className="text-sm md:text-lg font-medium text-app-text-primary pr-4">
                {item.question}
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="text-app-text-secondary shrink-0 flex items-center justify-center size-8 rounded-full bg-app-surface-glass-faint"
              >
                <ChevronDown size={18} />
              </motion.div>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 text-app-text-secondary leading-relaxed">
                    <p>{item.answer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
