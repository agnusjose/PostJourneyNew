import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Using the same IP as seen in LoginScreen, but targeting the /api route used by doctorRoutes
const BASE_URL = 'http://172.16.230.150:5000/api';
const BASE_URL_IMAGE = 'http://172.16.230.150:5000';

export default function ConsultDoctor({ navigation, embedded }) {
    const { user } = useAuth(); // Get logged-in user details
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Booking Modal State
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [problem, setProblem] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);

    // Slot Selection
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [slotsLoading, setSlotsLoading] = useState(false);

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            console.log('Fetching doctors from:', `${BASE_URL}/doctors/available`);
            const response = await axios.get(`${BASE_URL}/doctors/available`);
            setDoctors(response.data);
        } catch (error) {
            console.error('Error fetching doctors:', error);
            Alert.alert('Error', 'Failed to load doctors.');
        } finally {
            setLoading(false);
        }
    };

    const handleBookPress = async (doctor) => {
        if (!doctor.isOnline) {
            Alert.alert("Doctor Offline", "This doctor is currently offline and not accepting bookings.");
            return;
        }
        setSelectedDoctor(doctor);
        setProblem('');
        setSelectedSlot(null);
        setModalVisible(true);
        fetchSlots(doctor._id);
    };

    const fetchSlots = async (doctorId) => {
        setSlotsLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await axios.get(`${BASE_URL}/doctors/${doctorId}/slots?date=${today}`);

            // Filter out past time slots for today
            const now = new Date();
            const filteredSlots = response.data.map((slot) => {
                // Parse slot time like "10:00 AM", "2:30 PM"
                const timeStr = slot.time;
                const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                if (match) {
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const period = match[3].toUpperCase();

                    if (period === 'PM' && hours !== 12) hours += 12;
                    if (period === 'AM' && hours === 12) hours = 0;

                    const slotDate = new Date();
                    slotDate.setHours(hours, minutes, 0, 0);

                    if (slotDate <= now) {
                        return { ...slot, isBooked: true, isPast: true };
                    }
                }
                return slot;
            });

            setSlots(filteredSlots);
        } catch (error) {
            console.error('Error fetching slots:', error);
        } finally {
            setSlotsLoading(false);
        }
    };

    const confirmBooking = async () => {
        if (!problem.trim()) {
            Alert.alert('Required', 'Please describe your problem.');
            return;
        }
        if (!selectedSlot) {
            Alert.alert('Required', 'Please select a time slot.');
            return;
        }

        setBookingLoading(true);
        try {
            const payload = {
                patientId: user?.userId,
                patientName: user?.name,
                doctorId: selectedDoctor._id,
                problem: problem,
                date: new Date().toISOString().split('T')[0],
                timeSlot: selectedSlot
            };

            setModalVisible(false);
            navigation.navigate("PaymentScreen", {
                type: 'consultation',
                amount: selectedDoctor.consultationFee,
                doctorId: selectedDoctor._id,
                bookingData: payload
            });
        } catch (error) {
            console.error('Booking redirection error:', error);
            Alert.alert('Error', 'Failed to initiate payment.');
        } finally {
            setBookingLoading(false);
        }
    };

    const renderDoctor = ({ item }) => (
        <View style={[styles.card, !item.isOnline && styles.cardOffline]}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                    {item.doctorImage ? (
                        <Image source={{ uri: `${BASE_URL_IMAGE}${item.doctorImage}` }} style={styles.doctorPhoto} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {item.name.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.nameRow}>
                        <Text style={styles.doctorName}> {item.name}</Text>
                        {item.isOnline ? (
                            <View style={styles.onlineBadge}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.onlineText}>Online</Text>
                            </View>
                        ) : (
                            <View style={styles.offlineBadge}>
                                <View style={styles.offlineDot} />
                                <Text style={styles.offlineText}>Offline</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.specialization}>{item.specialization}</Text>
                    {item.qualification && <Text style={styles.qualification}>{item.qualification}</Text>}
                    <Text style={styles.experience}>Exp: {item.experience} years</Text>
                    {item.languages && <Text style={styles.languages}>🗣 {item.languages}</Text>}
                    <Text style={styles.fee}>Fee: ₹{item.consultationFee}</Text>
                </View>
            </View>
            <Text style={styles.aboutText} numberOfLines={2}>{item.about}</Text>
            <TouchableOpacity
                style={[styles.bookButton, !item.isOnline && styles.bookButtonDisabled]}
                onPress={() => handleBookPress(item)}
                disabled={!item.isOnline}
            >
                <Text style={styles.bookButtonText}>
                    {item.isOnline ? 'Book Consultation' : 'Doctor is Offline'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {!embedded && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Consult a Doctor</Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={doctors}
                    keyExtractor={(item) => item._id}
                    renderItem={renderDoctor}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No doctors available at the moment.</Text>
                    }
                />
            )}

            {/* Booking Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Book Consultation</Text>
                        {selectedDoctor && (
                            <Text style={styles.modalSubtitle}>with {selectedDoctor.name}</Text>
                        )}

                        <Text style={styles.label}>Select Time Slot (Today):</Text>
                        {slotsLoading ? (
                            <ActivityIndicator color="#1E88E5" style={{ marginBottom: 15 }} />
                        ) : (
                            <View style={styles.slotsContainer}>
                                {slots.map((slot) => (
                                    <TouchableOpacity
                                        key={slot.time}
                                        style={[
                                            styles.slotButton,
                                            slot.isBooked && styles.slotBooked,
                                            selectedSlot === slot.time && styles.slotSelected
                                        ]}
                                        disabled={slot.isBooked}
                                        onPress={() => setSelectedSlot(slot.time)}
                                    >
                                        <Text style={[
                                            styles.slotText,
                                            slot.isBooked && styles.slotTextBooked,
                                            selectedSlot === slot.time && styles.slotTextSelected
                                        ]}>{slot.time}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <Text style={styles.label}>Describe your problem:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="E.g., Severe headache since 2 days..."
                            multiline
                            numberOfLines={4}
                            value={problem}
                            onChangeText={setProblem}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmBooking}
                                disabled={bookingLoading}
                            >
                                {bookingLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.confirmButtonText}>Confirm</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        elevation: 4,
    },
    backButton: {
        marginRight: 15,
    },
    backButtonText: {
        fontSize: 16,
        color: '#1E88E5',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    listContainer: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E88E5',
    },
    doctorPhoto: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    doctorName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0A3D52',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 4,
    },
    onlineText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#059669',
    },
    specialization: {
        fontSize: 14,
        color: '#1D8FAB',
        fontWeight: '600',
        marginTop: 2,
    },
    qualification: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    experience: {
        fontSize: 13,
        color: '#546E7A',
        marginTop: 2,
    },
    languages: {
        fontSize: 12,
        color: '#475569',
        marginTop: 2,
    },
    fee: {
        fontSize: 14,
        color: '#1D8FAB',
        fontWeight: 'bold',
        marginTop: 4,
    },
    aboutText: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 15,
        fontStyle: 'italic',
    },
    bookButton: {
        backgroundColor: '#0A5F7A',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    bookButtonDisabled: {
        backgroundColor: '#cbd5e1',
    },
    bookButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardOffline: {
        opacity: 0.75,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    offlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    offlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444',
        marginRight: 4,
    },
    offlineText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#DC2626',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#7F8C8D',
        marginTop: 50,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        elevation: 5,
        maxHeight: '90%', // Ensure modal doesn't overflow
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0A3D52',
        marginBottom: 5,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#546E7A',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#34495E',
        marginBottom: 10,
    },
    slotsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    slotButton: {
        width: '48%',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D7E5ED',
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        marginBottom: 8,
    },
    slotSelected: {
        backgroundColor: '#0A5F7A',
        borderColor: '#0A5F7A',
    },
    slotBooked: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        opacity: 0.6,
    },
    slotText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
    },
    slotTextSelected: {
        color: '#fff',
    },
    slotTextBooked: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    input: {
        backgroundColor: '#F0F4F8',
        borderRadius: 10,
        padding: 15,
        height: 80,
        textAlignVertical: 'top',
        fontSize: 16,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#CFD8DC',
        marginRight: 10,
    },
    confirmButton: {
        backgroundColor: '#0A5F7A',
        marginLeft: 10,
    },
    cancelButtonText: {
        color: '#455A64',
        fontWeight: 'bold',
        fontSize: 16,
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
