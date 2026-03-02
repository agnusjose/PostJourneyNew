import React, { useMemo, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";

// MediaPipe Pose 33-landmark skeleton connections (indices).
const POSE_CONNECTIONS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // shoulders, arms
    [11, 23], [12, 24], [23, 24],                       // torso
    [23, 25], [25, 27], [24, 26], [26, 28],            // legs
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10], // face
];

const MIN_VISIBILITY = 0.4;
const JOINT_RADIUS = 5;
const LINE_WIDTH = 3;
const SKELETON_COLOR = "#7CB342";
const JOINT_COLOR = "#1ABC9C";

/**
 * Overlay that draws pose skeleton on top of the video feed.
 * landmarks: array of { x, y, visibility } (normalized 0-1; x right, y down).
 * mirrored: if true, flip x so skeleton aligns with front-camera mirror.
 */
export default function PoseSkeletonOverlay({ landmarks, mirrored = true, style }) {
    const [layout, setLayout] = useState({ width: 0, height: 0 });
    const onLayout = useCallback((e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    }, []);

    const { lines, points } = useMemo(() => {
        if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 33 || layout.width <= 0 || layout.height <= 0) {
            return { lines: [], points: [] };
        }
        const { width, height } = layout;
        const toPx = (x, y) => {
            let u = x, v = y;
            if (mirrored) u = 1 - u;
            return { px: u * width, py: v * height };
        };
        const visible = (i) => (landmarks[i] && (landmarks[i].visibility ?? 1) >= MIN_VISIBILITY);
        const linesOut = [];
        const pointsOut = [];

        POSE_CONNECTIONS.forEach(([a, b]) => {
            if (!visible(a) || !visible(b)) return;
            const p1 = toPx(landmarks[a].x, landmarks[a].y);
            const p2 = toPx(landmarks[b].x, landmarks[b].y);
            linesOut.push({ x1: p1.px, y1: p1.py, x2: p2.px, y2: p2.py });
        });

        landmarks.forEach((lm) => {
            if (!lm || (lm.visibility !== undefined && lm.visibility < MIN_VISIBILITY)) return;
            const p = toPx(lm.x, lm.y);
            pointsOut.push({ x: p.px, y: p.py });
        });

        return { lines: linesOut, points: pointsOut };
    }, [landmarks, mirrored, layout.width, layout.height]);

    return (
        <View style={[styles.overlay, style]} onLayout={onLayout} pointerEvents="none">
            {lines.map(({ x1, y1, x2, y2 }, idx) => (
                <SkeletonLine key={`line-${idx}`} x1={x1} y1={y1} x2={x2} y2={y2} />
            ))}
            {points.map(({ x, y }, idx) => (
                <View
                    key={`pt-${idx}`}
                    style={[
                        styles.joint,
                        {
                            left: x - JOINT_RADIUS,
                            top: y - JOINT_RADIUS,
                            width: JOINT_RADIUS * 2,
                            height: JOINT_RADIUS * 2,
                            borderRadius: JOINT_RADIUS,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

function SkeletonLine({ x1, y1, x2, y2 }) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return (
        <View
            style={[
                styles.line,
                {
                    left: midX - length / 2,
                    top: midY - LINE_WIDTH / 2,
                    width: length,
                    height: LINE_WIDTH,
                    transform: [{ rotate: `${angleDeg}deg` }],
                },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "transparent",
    },
    line: {
        position: "absolute",
        backgroundColor: SKELETON_COLOR,
        borderRadius: LINE_WIDTH / 2,
    },
    joint: {
        position: "absolute",
        backgroundColor: JOINT_COLOR,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.6)",
    },
});
