import React, { useEffect, useRef, useState } from "react";
import { View, Text, PanResponder, LayoutRectangle } from "react-native";

type SelectableTextProps = {
  text: string;
  lineHeight?: number;
};

export default function SelectableText({ text, lineHeight }: SelectableTextProps) {
  const words = (text ?? "").split(/\s+/).filter(Boolean);

  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);

  const wordPositions = useRef<(LayoutRectangle | null)[]>([]);

  useEffect(() => {
    wordPositions.current = new Array(words.length).fill(null);
    setStartIndex(null);
    setEndIndex(null);
  }, [text]);

  const findWordAt = (x: number, y: number): number | null => {
    const index = wordPositions.current.findIndex((pos) => {
      if (!pos) return false;
      return (
        x >= pos.x &&
        x <= pos.x + pos.width &&
        y >= pos.y &&
        y <= pos.y + pos.height
      );
    });
    return index === -1 ? null : index;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const index = findWordAt(locationX, locationY);
      if (index === null) {
        setStartIndex(null);
        setEndIndex(null);
        return;
      }
      setStartIndex(index);
      setEndIndex(index);
    },

    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const index = findWordAt(locationX, locationY);
      if (index !== null) {
        setEndIndex(index);
      }
    },

    onPanResponderRelease: () => {
      // you can save highlight here later
    },
  });

  const getHighlightedRange = () => {
  if (startIndex === null || endIndex === null) return [-1, -1];
    return [
      Math.min(startIndex, endIndex),
      Math.max(startIndex, endIndex),
    ];
  };

  const [start, end] = getHighlightedRange();

  return (
    <View
      {...panResponder.panHandlers}
      style={{ flexDirection: "row", flexWrap: "wrap" }}
    >
      {words.map((word, index) => {
        const isHighlighted = index >= start && index <= end;

        return (
          <Text
            key={index}
            onLayout={(e) => {
              wordPositions.current[index] = e.nativeEvent.layout;
            }}
            style={{
              lineHeight,
              backgroundColor: isHighlighted ? "yellow" : "transparent",
            }}
          >
            {word + " "}
          </Text>
        );
      })}
    </View>
  );
}
