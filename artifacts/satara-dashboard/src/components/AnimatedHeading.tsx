import React, { useState, useEffect } from 'react';

interface AnimatedHeadingProps {
  text: string;
  className?: string;
  charDelay?: number; // 30ms
  initialDelay?: number; // 200ms
  transitionDuration?: number; // 500ms
}

export const AnimatedHeading: React.FC<AnimatedHeadingProps> = ({
  text,
  className = '',
  charDelay = 30,
  initialDelay = 200,
  transitionDuration = 500,
}) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(true);
    }, initialDelay);
    return () => clearTimeout(timer);
  }, [initialDelay]);

  const lines = text.split('\n');
  const firstLineLength = lines[0] ? lines[0].length : 0;

  return (
    <h1 className={className} style={{ letterSpacing: '-0.04em' }}>
      {lines.map((line, lineIndex) => {
        let cumulativeCharIndex = 0;
        const words = line.split(' ');
        return (
          <span key={lineIndex} className="block">
            {words.map((word, wordIndex) => {
              const wordStartCharIndex = cumulativeCharIndex;
              cumulativeCharIndex += word.length + 1;

              return (
                <span key={wordIndex} className="inline-block whitespace-nowrap">
                  {word.split('').map((char, charIndex) => {
                    const lineLength = firstLineLength;
                    const absoluteCharIndex = wordStartCharIndex + charIndex;
                    const staggerDelay = (lineIndex * lineLength * charDelay) + (absoluteCharIndex * charDelay);

                    return (
                      <span
                        key={charIndex}
                        className="inline-block transition-all ease-out"
                        style={{
                          opacity: animate ? 1 : 0,
                          transform: animate ? 'translateX(0)' : 'translateX(-18px)',
                          transitionDuration: `${transitionDuration}ms`,
                          transitionDelay: `${staggerDelay}ms`,
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                  {/* Space between words */}
                  {wordIndex < words.length - 1 && (
                    <span
                      className="inline-block transition-all ease-out"
                      style={{
                        opacity: animate ? 1 : 0,
                        transform: animate ? 'translateX(0)' : 'translateX(-18px)',
                        transitionDuration: `${transitionDuration}ms`,
                        transitionDelay: `${((lineIndex * firstLineLength * charDelay) + (wordStartCharIndex + word.length) * charDelay)}ms`,
                      }}
                    >
                      {'\u00A0'}
                    </span>
                  )}
                </span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
};
