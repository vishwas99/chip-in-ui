import React, { useRef, useState, useCallback, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ToastAction = 'success' | 'error' | 'warning' | 'info';

interface ToastEntry {
    id: string;
    title: string;
    message: string;
    action: ToastAction;
}

interface ToastContextValue {
    showToast: (title: string, message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useAppToast = () => useContext(ToastContext);

const TOAST_COLORS: Record<ToastAction, { bg: string; border: string; icon: string }> = {
    success: { bg: '#052e16', border: '#16a34a', icon: '#22c55e' },
    error:   { bg: '#450a0a', border: '#dc2626', icon: '#ef4444' },
    warning: { bg: '#431407', border: '#d97706', icon: '#f59e0b' },
    info:    { bg: '#0c1a3a', border: '#3b4f7a', icon: '#818cf8' },
};

const TOAST_ICONS: Record<ToastAction, React.FC<any>> = {
    success: CheckCircle,
    error:   AlertCircle,
    warning: AlertTriangle,
    info:    Info,
};

const TOAST_DURATION = 3000;
const ANIM_DURATION = 300;

function SingleToast({ entry, onDone }: { entry: ToastEntry; onDone: () => void }) {
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity    = useRef(new Animated.Value(0)).current;

    const colors = TOAST_COLORS[entry.action];
    const Icon   = TOAST_ICONS[entry.action];

    React.useEffect(() => {
        // Slide in
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
            Animated.timing(opacity,    { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }),
        ]).start();

        // After duration, slide out then call onDone
        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateY, { toValue: 120, duration: ANIM_DURATION, useNativeDriver: true }),
                Animated.timing(opacity,    { toValue: 0,   duration: ANIM_DURATION, useNativeDriver: true }),
            ]).start(() => onDone());
        }, TOAST_DURATION);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View
            style={[
                styles.toast,
                { backgroundColor: colors.bg, borderColor: colors.border },
                { transform: [{ translateY }], opacity },
            ]}
        >
            <Icon size={22} color={colors.icon} />
            <View style={styles.textBlock}>
                <Text style={styles.title}>{entry.title}</Text>
                {entry.message ? <Text style={styles.message}>{entry.message}</Text> : null}
            </View>
        </Animated.View>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [queue, setQueue]       = useState<ToastEntry[]>([]);
    const [current, setCurrent]   = useState<ToastEntry | null>(null);
    const isShowing               = useRef(false);
    const queueRef                = useRef<ToastEntry[]>([]);

    const showNext = useCallback(() => {
        const next = queueRef.current.shift();
        if (next) {
            isShowing.current = true;
            setCurrent(next);
        } else {
            isShowing.current = false;
            setCurrent(null);
        }
    }, []);

    const showToast = useCallback((title: string, message: string, action: ToastAction = 'info') => {
        const entry: ToastEntry = { id: Math.random().toString(36).slice(2), title, message, action };
        queueRef.current.push(entry);
        if (!isShowing.current) {
            showNext();
        }
    }, [showNext]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {current && (
                <View style={styles.container} pointerEvents="none">
                    <SingleToast key={current.id} entry={current} onDone={showNext} />
                </View>
            )}
        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 110,
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        width: SCREEN_WIDTH - 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    textBlock: {
        flex: 1,
    },
    title: {
        color: '#f1f5f9',
        fontWeight: '700',
        fontSize: 14,
    },
    message: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 2,
    },
});
