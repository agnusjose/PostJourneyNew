import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://192.168.172.72:5000/api';

export default function MyConsultations({ navigation, embedded }) {
    const { user } = useAuth();
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState({});
    const consultationsRef = useRef([]);
    const [tick, setTick] = useState(0); // Force re-render every second

    // Notes Modal
    const [notesModalVisible, setNotesModalVisible] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState(null);

    useEffect(() => {
        fetchConsultations();

        // Poll server status every 10s
        const statusPoll = setInterval(() => updateStatuses(), 10000);

        // Re-render every second so countdowns update AND isActive transitions happen promptly
        const timer = setInterval(() => {
            setTick(t => t + 1);
        }, 1000);

        return () => {
            clearInterval(statusPoll);
            clearInterval(timer);
        };
    }, []);

    const fetchConsultations = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/patient/${user.userId || user.id}/consultations`);
            const sorted = response.data.sort((a, b) => {
                const dateA = new Date(a.consultationDate);
                const dateB = new Date(b.consultationDate);
                const now = new Date();
                const aIsPast = dateA < now;
                const bIsPast = dateB < now;
                if (aIsPast && !bIsPast) return 1;
                if (!aIsPast && bIsPast) return -1;
                if (!aIsPast && !bIsPast) return dateA - dateB;
                return dateB - dateA;
            });
            setConsultations(sorted);
            consultationsRef.current = sorted;
            updateStatuses(sorted);
        } catch (error) {
            console.error('Error fetching consultations:', error);
            Alert.alert('Error', 'Failed to load consultations.');
        } finally {
            setLoading(false);
        }
    };

    const updateStatuses = async (data) => {
        const targetData = data || consultationsRef.current;
        if (!targetData || targetData.length === 0) return;

        try {
            const statusPromises = targetData.map(c =>
                axios.get(`${BASE_URL}/consultation/${c._id}/status`)
                    .then(res => ({ id: c._id, status: res.data }))
                    .catch(() => ({ id: c._id, status: null }))
            );
            const results = await Promise.all(statusPromises);
            setStatuses(prev => {
                const next = { ...prev };
                results.forEach(res => {
                    if (res.status) next[res.id] = res.status;
                });
                return next;
            });
        } catch (error) {
            console.error('Error in updateStatuses:', error);
        }
    };

    const handleJoinChat = async (consultation) => {
        navigation.navigate('ChatScreen', { consultation });
    };

    const handleOpenNotes = async (item) => {
        try {
            const res = await axios.get(`${BASE_URL}/consultation/${item._id}`);
            if (res.data.success && res.data.consultation) {
                setSelectedConsultation(res.data.consultation);
            } else {
                setSelectedConsultation(item);
            }
        } catch (e) {
            setSelectedConsultation(item);
        }
        setNotesModalVisible(true);
    };

    const handleSubmitReview = async () => {
        if (rating < 1 || rating > 5) {
            Alert.alert("Invalid Rating", "Please provide a rating between 1 and 5.");
            return;
        }
        setSubmittingReview(true);
        try {
            const res = await axios.post(`${BASE_URL}/reviews`, {
                patientId: user.userId || user.id,
                doctorId: selectedConsultation.doctorId,
                consultationId: selectedConsultation._id,
                rating,
                comment
            });
            if (res.data.success) {
                Alert.alert("Thank You", "Your review has been submitted.");
                setReviewModalVisible(false);
                fetchConsultations();
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.error || "Failed to submit review.");
        } finally {
            setSubmittingReview(false);
        }
    };

    /**
     * Compute the session status LOCALLY using the same IST-aware logic as the server.
     * This runs every second (via `tick`) so transitions happen immediately
     * without waiting for the 10s server poll.
     *
     * Falls back to the last known server status for isPast/manual-end detection.
     */
    const getLocalStatus = (item) => {
        const serverStatus = statuses[item._id];

        // Parse consultation date + time slot (IST-aware, same as server)
        const d = new Date(item.consultationDate);
        const timeSlot = item.timeSlot || '';
        const parts = timeSlot.trim().split(' ');
        if (parts.length !== 2) {
            // Fallback to server status if slot is malformed
            return serverStatus || null;
        }
        const [timePart, modifier] = parts;
        let [hours, minutes] = timePart.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return serverStatus || null;
        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        // Build startTime using IST offset (UTC+5:30) — mirrors server logic exactly
        const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
        const utcMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        const istMidnight = utcMidnight - IST_OFFSET_MS;
        const startTime = new Date(istMidnight + (hours * 60 + minutes) * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        const now = new Date();

        // Respect manual end from server (doctor clicked "End" button)
        const isManuallyEnded = serverStatus?.manualStatus === 'completed' ||
            serverStatus?.manualStatus === 'cancelled';

        const isPast = isManuallyEnded || now > endTime;
        const isActive = !isPast && now >= startTime;
        const isUpcoming = !isPast && now < startTime;

        return {
            isActive,
            isUpcoming,
            isPast,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            manualStatus: serverStatus?.manualStatus,
        };
    };

    const getCountdown = (startTimeStr) => {
        const start = new Date(startTimeStr);
        const now = new Date();
        const diff = start - now;
        if (diff <= 0) return null;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const renderConsultation = ({ item }) => {
        // Use local (real-time) status computation — updates every second via `tick`
        const s = getLocalStatus(item);

        let buttonText = 'Loading...';
        let buttonColor = '#BDC3C7';
        let disabled = true;

        if (!s) {
            // Status not yet loaded from server — show loading
        } else if (s.isActive) {
            buttonText = '💬 Join Chat';
            buttonColor = '#22c55e';
            disabled = false;
        } else if (s.isUpcoming) {
            const countdown = getCountdown(s.startTime);
            buttonText = countdown ? `⏳ ${countdown}` : '⏳ Upcoming';
            buttonColor = '#94a3b8';
            disabled = true;
        } else if (s.isPast) {
            buttonText = 'Time is Over';
            buttonColor = '#ef4444';
            disabled = true;
        }

        return (
            <View style={styles.card}>
                <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                        <Text style={styles.doctorName}> {item.doctorName}</Text>
                        <Text style={styles.dateTime}>{new Date(item.consultationDate).toLocaleDateString()} at {item.timeSlot}</Text>
                        <Text style={styles.problem} numberOfLines={1}>{item.problemDescription}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: buttonColor }]}
                        onPress={() => !disabled && handleJoinChat(item)}
                        disabled={disabled}
                    >
                        <Text style={styles.statusBadgeText}>{buttonText}</Text>
                    </TouchableOpacity>
                </View>

                {s?.isPast && (
                    <View style={styles.cardBottom}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenNotes(item)}>
                            <Text style={styles.actionBtnText}>📋 View Notes</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const sections = React.useMemo(() => {
        const upcoming = [];
        const completed = [];

        consultations.forEach(c => {
            const s = getLocalStatus(c);
            if (s?.isPast) {
                completed.push(c);
            } else {
                upcoming.push(c);
            }
        });

        upcoming.sort((a, b) => new Date(a.consultationDate) - new Date(b.consultationDate));
        completed.sort((a, b) => new Date(b.consultationDate) - new Date(a.consultationDate));

        const result = [];
        if (upcoming.length > 0) result.push({ title: 'Upcoming Sessions', data: upcoming });
        if (completed.length > 0) result.push({ title: 'Completed Sessions', data: completed });
        return result;
    }, [consultations, statuses, tick]); // tick ensures sections re-sort when time changes

    return (
        <View style={styles.container}>
            {!embedded && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Consultations</Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 50 }} />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item._id}
                    renderItem={renderConsultation}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderTitle}>{title}</Text>
                            <View style={styles.sectionBorder} />
                        </View>
                    )}
                    contentContainerStyle={styles.listContainer}
                    stickySectionHeadersEnabled={false}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>You haven't booked any consultations yet.</Text>
                    }
                    extraData={tick} // ← CRITICAL: tells SectionList to re-render items every second
                />
            )}

            {/* View Notes Modal */}
            <Modal
                visible={notesModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setNotesModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Consultation Notes</Text>
                        <Text style={styles.modalSubtitle}>From  {selectedConsultation?.doctorName}</Text>

                        <View style={styles.noteSection}>
                            <Text style={styles.noteLabel}>Diagnosis:</Text>
                            <Text style={styles.noteText}>{selectedConsultation?.diagnosis || "Not provided"}</Text>
                        </View>
                        <View style={styles.noteSection}>
                            <Text style={styles.noteLabel}>Medicines:</Text>
                            <Text style={styles.noteText}>{selectedConsultation?.medicines || "Not provided"}</Text>
                        </View>
                        <View style={styles.noteSection}>
                            <Text style={styles.noteLabel}>Exercise Advice:</Text>
                            <Text style={styles.noteText}>{selectedConsultation?.exerciseAdvice || "Not provided"}</Text>
                        </View>
                        {selectedConsultation?.followUpDate && (
                            <View style={styles.noteSection}>
                                <Text style={styles.noteLabel}>Follow-up Date:</Text>
                                <Text style={styles.noteText}>{new Date(selectedConsultation.followUpDate).toLocaleDateString()}</Text>
                            </View>
                        )}
                        <View style={styles.noteSection}>
                            <Text style={styles.noteLabel}>General Comments:</Text>
                            <Text style={styles.noteText}>{selectedConsultation?.generalComments || "Not provided"}</Text>
                        </View>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setNotesModalVisible(false)}>
                            <Text style={styles.closeBtnText}>Close</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F6F9' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        elevation: 4,
    },
    backButton: { marginRight: 15 },
    backButtonText: { fontSize: 16, color: '#0A5F7A', fontWeight: '600' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50' },
    listContainer: { padding: 20 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 15,
        elevation: 3,
        overflow: 'hidden',
    },
    cardTop: {
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardInfo: { flex: 1 },
    doctorName: { fontSize: 17, fontWeight: 'bold', color: '#2C3E50' },
    dateTime: { fontSize: 14, color: '#0A5F7A', marginTop: 4 },
    problem: { fontSize: 13, color: '#64748b', marginTop: 4 },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 90,
        alignItems: 'center',
    },
    statusBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    cardBottom: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: '#f8fafc',
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: { fontSize: 13, fontWeight: '600', color: '#475569' },
    divider: {
        width: 1,
        backgroundColor: '#e2e8f0',
        height: '60%',
        alignSelf: 'center',
    },
    emptyText: { textAlign: 'center', fontSize: 16, color: '#7F8C8D', marginTop: 50 },
    sectionHeader: { marginTop: 10, marginBottom: 15, backgroundColor: '#F0F6F9' },
    sectionHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#0A3D52', letterSpacing: 0.5 },
    sectionBorder: {
        height: 3,
        width: 30,
        backgroundColor: '#0A5F7A',
        marginTop: 4,
        borderRadius: 2,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0A3D52', marginBottom: 5, textAlign: 'center' },
    modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 20, textAlign: 'center' },
    noteSection: { marginBottom: 15 },
    noteLabel: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
    noteText: { fontSize: 15, color: '#0A3D52', lineHeight: 22 },
    closeBtn: { backgroundColor: '#0A5F7A', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    closeBtnText: { color: '#fff', fontWeight: 'bold' },
    ratingRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    star: { fontSize: 40, color: '#e2e8f0', marginHorizontal: 5 },
    starSelected: { color: '#f59e0b' },
    reviewInput: {
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    modalBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#f1f5f9', marginRight: 10 },
    submitBtn: { backgroundColor: '#10B981', marginLeft: 10 },
    cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
    submitBtnText: { color: '#fff', fontWeight: 'bold' },
});