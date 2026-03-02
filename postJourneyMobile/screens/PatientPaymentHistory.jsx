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

const BASE_URL = 'http://172.16.230.150:5000/api';

export default function PatientPaymentHistory({ navigation, route, embedded = false }) {
    const { userId } = route.params || {};
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'successful', 'failed'

    useEffect(() => {
        fetchPayments();
    }, [userId]);

    const fetchPayments = async () => {
        if (!userId) {
            console.error("❌ No User ID provided for Payment History");
            setLoading(false);
            return;
        }

        console.log(`fetching payments for user: ${userId}`);
        setLoading(true);
        try {
            const url = `${BASE_URL}/patient/${userId}/payments`;
            console.log("Request URL:", url);

            const response = await axios.get(url);
            console.log("Response:", response.data);

            if (response.data.success) {
                setPayments(response.data.payments);
            } else {
                Alert.alert('Error', response.data.error || 'Failed to fetch payments');
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            const msg = error.response?.data?.error || error.message || 'Failed to load payment history';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredPayments = () => {
        if (!Array.isArray(payments)) return [];
        if (filter === 'all') return payments;
        return payments.filter(p => p.status === filter);
    };

    const getTotalAmount = () => {
        return payments
            .filter(p => p.status === 'successful')
            .reduce((sum, p) => sum + p.amount, 0);
    };

    const renderContent = () => (
        <ScrollView contentContainerStyle={[styles.container, embedded && { paddingTop: 15 }]}>
            {!embedded && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payment History</Text>
                </View>
            )}

            {/* Stats Card */}
            <View style={styles.statsCard}>
                <View style={styles.accentBar} />
                <View style={styles.statsContent}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Paid</Text>
                        <Text style={styles.statValue}>₹{payments.length * 100}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Transactions</Text>
                        <Text style={styles.statValue}>{payments.length}</Text>
                    </View>
                </View>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'successful' && styles.filterBtnActive]}
                    onPress={() => setFilter('successful')}
                >
                    <Text style={[styles.filterBtnText, filter === 'successful' && styles.filterBtnTextActive]}>Successful</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'failed' && styles.filterBtnActive]}
                    onPress={() => setFilter('failed')}
                >
                    <Text style={[styles.filterBtnText, filter === 'failed' && styles.filterBtnTextActive]}>Failed</Text>
                </TouchableOpacity>
            </View>

            {/* Payment List */}
            {loading ? (
                <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 50 }} />
            ) : getFilteredPayments().length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No payments found</Text>
                </View>
            ) : (
                getFilteredPayments().map((payment) => (
                    <View key={payment._id} style={styles.paymentCard}>
                        <View style={[styles.paymentAccentBar, {
                            backgroundColor: payment.status === 'successful' ? '#10B981' : '#EF4444'
                        }]} />
                        <View style={styles.paymentContent}>
                            <View style={styles.paymentHeader}>
                                <View>
                                    <Text style={styles.paymentType}>
                                        {payment.type === 'consultation' ? '👨‍⚕️ Consultation' : '🛒 Equipment'}
                                    </Text>
                                    {payment.doctorName && (
                                        <Text style={styles.paymentDoctor}> {payment.doctorName}</Text>
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
                                            {payment.status === 'successful' ? '✓ Paid' : '✗ Failed'}
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
    );

    if (embedded) {
        return <View style={{ flex: 1 }}>{renderContent()}</View>;
    }

    return (
        <ImageBackground
            source={require("../assets/pjlogo_bg.png")}
            style={styles.bg}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                {renderContent()}
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
        color: '#0A3D52',
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
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
        backgroundColor: '#0A5F7A',
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
        color: '#0A3D52',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E1E8ED',
    },
    filterContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D7E5ED',
        elevation: 2,
    },
    filterBtnActive: {
        backgroundColor: '#0A5F7A',
        borderColor: '#1E88E5',
    },
    filterBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    filterBtnTextActive: {
        color: '#fff',
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
    paymentDoctor: {
        fontSize: 14,
        color: '#64748b',
    },
    paymentAmountContainer: {
        alignItems: 'flex-end',
    },
    paymentAmount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0A5F7A',
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
