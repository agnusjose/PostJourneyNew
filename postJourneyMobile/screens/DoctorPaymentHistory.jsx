import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ImageBackground,
} from 'react-native';
import axios from 'axios';

const BASE_URL = 'http://10.63.72.99:5000/api';

export default function DoctorPaymentHistory({ navigation, route }) {
    const { userId } = route.params || {};
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayments();
    }, [userId]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/doctor/${userId}/payments`);
            if (response.data.success) {
                setPayments(response.data.payments);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            Alert.alert('Error', 'Failed to load payment history');
        } finally {
            setLoading(false);
        }
    };

    const getTotalEarnings = () => {
        return payments
            .filter(p => p.status === 'successful')
            .reduce((sum, p) => sum + p.amount, 0);
    };

    const getSuccessfulCount = () => {
        return payments.filter(p => p.status === 'successful').length;
    };

    return (
        <ImageBackground
            source={require("../assets/pjlogo_bg.png")}
            style={styles.bg}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Payment History</Text>
                    </View>

                    {/* Stats Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.accentBar} />
                        <View style={styles.statsContent}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Total Earnings</Text>
                                <Text style={styles.statValue}>₹{getSuccessfulCount() * 100}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Consultations</Text>
                                <Text style={styles.statValue}>{getSuccessfulCount()}</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Recent Payments</Text>

                    {/* Payment List */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 50 }} />
                    ) : payments.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No payments received yet</Text>
                        </View>
                    ) : (
                        payments.map((payment) => (
                            <View key={payment._id} style={styles.paymentCard}>
                                <View style={[styles.paymentAccentBar, {
                                    backgroundColor: payment.status === 'successful' ? '#10B981' : '#EF4444'
                                }]} />
                                <View style={styles.paymentContent}>
                                    <View style={styles.paymentHeader}>
                                        <View>
                                            <Text style={styles.paymentType}>
                                                👨‍⚕️ Consultation Fee
                                            </Text>
                                            {payment.patientName && (
                                                <Text style={styles.paymentPatient}>Patient: {payment.patientName}</Text>
                                            )}
                                        </View>
                                        <View style={styles.paymentAmountContainer}>
                                            <Text style={styles.paymentAmount}>₹100</Text>
                                            <View style={[styles.statusBadge, {
                                                backgroundColor: payment.status === 'successful' ? '#D1FAE5' : '#FEE2E2'
                                            }]}>
                                                <Text style={[styles.statusText, {
                                                    color: payment.status === 'successful' ? '#065F46' : '#991B1B'
                                                }]}>
                                                    {payment.status === 'successful' ? '✓ Received' : '✗ Failed'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={styles.paymentDate}>
                                        {new Date(payment.createdAt).toLocaleString()}
                                    </Text>
                                    {payment.transactionId && (
                                        <Text style={styles.transactionId}>ID: {payment.transactionId}</Text>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bg: { flex: 1 },
    overlay: { flex: 1, backgroundColor: 'rgba(245, 250, 255, 0.75)' },
    container: {
        paddingHorizontal: 22,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    backButton: {
        marginRight: 15,
    },
    backButtonText: {
        fontSize: 16,
        color: '#0A5F7A',
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#2C3E50',
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
        backgroundColor: '#10B981',
    },
    statsContent: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 5,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#10B981',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#D7E5ED', // Changed from #E1E8ED
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '700',
        marginBottom: 16,
        color: '#00796B', // Changed from #0A3D52
    },
    paymentCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#2C3E50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    paymentAccentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
    },
    paymentContent: {
        padding: 16,
        paddingLeft: 20,
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    paymentType: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0A3D52',
        marginBottom: 4,
    },
    paymentPatient: {
        fontSize: 14,
        color: '#64748b',
    },
    paymentAmountContainer: {
        alignItems: 'flex-end',
    },
    paymentAmount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#10B981',
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    paymentDate: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 4,
    },
    transactionId: {
        fontSize: 11,
        color: '#94a3b8',
        fontFamily: 'monospace',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        fontWeight: '500',
    },
});
