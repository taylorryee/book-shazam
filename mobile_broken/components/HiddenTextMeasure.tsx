import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextLayoutEvent,
  NativeSyntheticEvent,
} from "react-native";

type HiddenTextMeasureProps = {
  text: string;
  width: number;
  height: number;
  lineHeight: number;
  fontSize?: number;
  padding?: number;
onTextLayout: (e:TextLayoutEvent) => void;
};

export default function HiddenTextMeasure({
  text,
  width,
  height,
  lineHeight,
  fontSize = 16,
  padding = 20,
  onTextLayout,
}: HiddenTextMeasureProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.hiddenContainer,
        {
          width,
          height,
        },
      ]}
    >
      <View style={{ flex: 1, padding }}>
        <Text
          style={{
            lineHeight,
            fontSize,
          }}
          onTextLayout={onTextLayout}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: "absolute",
    opacity: 0,
  },
});