// ─── PostJourney Design System ───────────────────────────────────────────────
// Shared theme tokens used across all screens.
// Import: import { C, S } from '../theme';  (or '../../theme' from sub-folders)

import { StyleSheet, Platform, StatusBar } from 'react-native';

export const C = {
    primary: '#0A5F7A',
    secondary: '#1D8FAB',
    accent: '#2EC4B6',
    surface: '#FFFFFF',
    bg: '#F0F6F9',
    textDark: '#0D2535',
    textMid: '#4A6B7C',
    textLight: '#8BA9B8',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    cardBorder: '#DBE8EE',
    gradientStart: '#0A5F7A',
    gradientEnd: '#1D8FAB',
};

// Shared reusable style snippets
export const S = StyleSheet.create({
    safeTop: {
        paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 24) + 12,
    },
    card: {
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: C.cardBorder,
        elevation: 2,
        shadowColor: '#0D2535',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: C.textDark,
        letterSpacing: 0.2,
        marginBottom: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: C.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F0F6F9',
        borderWidth: 1,
        borderColor: C.cardBorder,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: C.textDark,
        fontWeight: '500',
    },
    btnPrimary: {
        backgroundColor: C.primary,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
    },
    btnPrimaryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
});
