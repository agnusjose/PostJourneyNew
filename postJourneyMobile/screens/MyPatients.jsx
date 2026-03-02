import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    ImageBackground,
    Modal,
    TextInput,
    Linking,
} from 'react-native';
import axios from 'axios';

const BASE_URL = "http://192.168.172.72:5000";

export default function MyPatients({ route, navigation }) {
    const { userId } = route.params;
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Patient History Modal
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientHistory, setPatientHistory] = useState(null);
    const [patientDocuments, setPatientDocuments] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/doctor/${userId}/consultations`);

            // Group consultations by patient
            const patientMap = new Map();
            response.data.forEach(consultation => {
                const patientId = consultation.patientId;
                if (!patientMap.has(patientId)) {
                    patientMap.set(patientId, {
                        patientId,
                        patientName: consultation.patientName,
                        consultations: [],
                        lastConsultation: consultation.consultationDate,
                    });
                }
                patientMap.get(patientId).consultations.push(consultation);

                // Update last consultation if this one is more recent
                const current = new Date(consultation.consultationDate);
                const last = new Date(patientMap.get(patientId).lastConsultation);
                if (current > last) {
                    patientMap.get(patientId).lastConsultation = consultation.consultationDate;
                }
            });

            // Sort consultations for each patient by date (latest first)
            patientMap.forEach(patient => {
                patient.consultations.sort((a, b) =>
                    new Date(b.consultationDate) - new Date(a.consultationDate)
                );
            });

            const patientList = Array.from(patientMap.values()).sort((a, b) =>
                new Date(b.lastConsultation) - new Date(a.lastConsultation)
            );

            setPatients(patientList);
        } catch (error) {
            console.error("Error fetching patients:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewPatientHistory = async (patient) => {
        setSelectedPatient(patient);
        setLoadingHistory(true);
        setHistoryModalVisible(true);

        try {
            const [historyRes, docsRes] = await Promise.all([
                axios.get(`${BASE_URL}/api/patient/${patient.patientId}/history`),
                axios.get(`${BASE_URL}/api/patient/${patient.patientId}/documents`)
            ]);

            if (historyRes.data.success) {
                setPatientHistory(historyRes.data);
            }
            if (docsRes.data.success) {
                setPatientDocuments(docsRes.data.documents);
            }
        } catch (e) {
            console.error("Error loading patient history:", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const openDocument = (fileUrl) => {
        const fullUrl = `${BASE_URL}${fileUrl}`;
        console.log("Opening document:", fullUrl);
        Linking.openURL(fullUrl).catch(() => {
            Alert.alert("Error", "Cannot open document");
        });
    };

    const filteredPatients = patients.filter(patient =>
        patient.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <ImageBackground
            source={require("../assets/pjlogo_bg.png")}
            style={styles.bg}
            resizeMode="cover"
        >
            <View style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>My Patients</Text>
                        <Text style={styles.subtitle}>View patient history and records</Text>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchCard}>
                        <View style={styles.accentBar} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search patients..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    {/* Stats Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{patients.length}</Text>
                            <Text style={styles.statLabel}>Total Patients</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>
                                {patients.reduce((sum, p) => sum + p.consultations.length, 0)}
                            </Text>
                            <Text style={styles.statLabel}>Consultations</Text>
                        </View>
                    </View>

                    {/* Patient List */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Patient List</Text>

                        {loading ? (
                            <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 20 }} />
                        ) : filteredPatients.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyIcon}>👥</Text>
                                <Text style={styles.emptyText}>
                                    {searchQuery ? 'No patients found' : 'No patients yet'}
                                </Text>
                            </View>
                        ) : (
                            filteredPatients.map((patient) => (
                                <TouchableOpacity
                                    key={patient.patientId}
                                    style={styles.patientCard}
                                    onPress={() => handleViewPatientHistory(patient)}
                                >
                                    <View style={styles.patientAccent} />
                                    <View style={styles.patientContent}>
                                        <View style={styles.patientHeader}>
                                            <View style={styles.patientIconCircle}>
                                                <Text style={styles.patientIcon}>👤</Text>
                                            </View>
                                            <View style={styles.patientInfo}>
                                                <Text style={styles.patientName}>{patient.patientName}</Text>
                                                <Text style={styles.patientMeta}>
                                                    {patient.consultations.length} consultation{patient.consultations.length !== 1 ? 's' : ''}
                                                </Text>
                                                <Text style={styles.patientDate}>
                                                    Last visit: {new Date(patient.lastConsultation).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.viewBtn}>
                                            <Text style={styles.viewBtnText}>View →</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Patient History Modal */}
            <Modal
                visible={historyModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setHistoryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalContainer}>
                        {loadingHistory ? (
                            <ActivityIndicator size="large" color="#1E88E5" />
                        ) : (
                            <>
                                <Text style={styles.modalTitle}>Patient History</Text>
                                <Text style={styles.modalSubtitle}>{selectedPatient?.patientName}</Text>

                                {patientHistory?.patient && (() => {
                                    const p = patientHistory.patient;
                                    const pp = p.patientProfile || {};

                                    const InfoRow = ({ label, value }) => {
                                        if (!value && value !== 0 && value !== false) return null;
                                        return (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>{label}</Text>
                                                <Text style={styles.infoValue}>{String(value)}</Text>
                                            </View>
                                        );
                                    };

                                    return (
                                        <>
                                            {/* Personal Info */}
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>👤 Personal Info</Text>
                                                <InfoRow label="Name" value={p.name} />
                                                <InfoRow label="Age" value={pp.age ? `${pp.age} yrs` : null} />
                                                <InfoRow label="Gender" value={pp.gender ? pp.gender.charAt(0).toUpperCase() + pp.gender.slice(1) : null} />
                                                <InfoRow label="Height" value={pp.height ? `${pp.height} cm` : null} />
                                                <InfoRow label="Weight" value={pp.weight ? `${pp.weight} kg` : null} />
                                                <InfoRow label="Blood Group" value={pp.bloodGroup} />
                                                <InfoRow label="Emergency Contact" value={pp.emergencyContact} />
                                            </View>

                                            {/* Medical Profile */}
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>🏥 Medical Profile</Text>
                                                <InfoRow label="Primary Condition" value={pp.primaryCondition} />
                                                <InfoRow label="Medical History" value={pp.medicalHistory} />
                                                <InfoRow label="Surgery History" value={pp.surgeryHistory} />
                                                <InfoRow label="Current Medications" value={pp.currentMedications} />
                                            </View>

                                            {/* Lifestyle & Goals */}
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>🌿 Lifestyle & Goals</Text>
                                                <InfoRow label="Activity Level" value={pp.activityLevel ? pp.activityLevel.replace(/_/g, ' ') : null} />
                                                <InfoRow label="Primary Goal" value={pp.primaryGoal ? pp.primaryGoal.replace(/_/g, ' ') : null} />
                                                <InfoRow label="Sleep" value={pp.sleepHours ? `${pp.sleepHours} hrs/night` : null} />
                                                <InfoRow label="Smoking" value={pp.smokingHabit === true ? 'Yes' : pp.smokingHabit === false ? 'No' : null} />
                                                <InfoRow label="Alcohol" value={pp.alcoholConsumption} />
                                            </View>
                                        </>
                                    );
                                })()}

                                <Text style={styles.sectionTitle}>📄 Medical Documents</Text>
                                {patientDocuments.length === 0 ? (
                                    <Text style={styles.emptyText}>No documents uploaded</Text>
                                ) : (
                                    patientDocuments.map(doc => (
                                        <TouchableOpacity
                                            key={doc._id}
                                            style={styles.documentCard}
                                            onPress={() => openDocument(doc.fileUrl)}
                                        >
                                            <Text style={styles.documentName}>
                                                {doc.fileType === 'pdf' ? '📄' : '🖼️'} {doc.fileName}
                                            </Text>
                                            <Text style={styles.documentDate}>
                                                {new Date(doc.uploadedAt).toLocaleDateString()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))
                                )}

                                <Text style={styles.sectionTitle}>📋 Consultation History</Text>
                                {patientHistory?.consultations?.length === 0 ? (
                                    <Text style={styles.emptyText}>No consultations</Text>
                                ) : (
                                    patientHistory?.consultations?.map((consult, idx) => (
                                        <View key={idx} style={styles.historyCard}>
                                            <Text style={styles.historyDate}>
                                                {new Date(consult.consultationDate).toDateString()} - {consult.timeSlot}
                                            </Text>
                                            <Text style={styles.historyDoctor}> {consult.doctorName}</Text>
                                            <Text style={styles.historyProblem}>Problem: {consult.problemDescription}</Text>
                                            {consult.diagnosis && (
                                                <Text style={styles.historyDetail}>Diagnosis: {consult.diagnosis}</Text>
                                            )}
                                            {consult.medicines && (
                                                <Text style={styles.historyDetail}>Medicines: {consult.medicines}</Text>
                                            )}
                                            {consult.exerciseAdvice && (
                                                <Text style={styles.historyDetail}>Exercise: {consult.exerciseAdvice}</Text>
                                            )}
                                            {consult.followUpDate && (
                                                <Text style={styles.historyDetail}>Follow-up: {new Date(consult.followUpDate).toLocaleDateString()}</Text>
                                            )}
                                        </View>
                                    ))
                                )}

                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => setHistoryModalVisible(false)}
                                >
                                    <Text style={styles.closeBtnText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </View>
            </Modal>
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
        marginBottom: 25,
    },
    backBtn: {
        marginBottom: 15,
    },
    backBtnText: {
        fontSize: 16,
        color: '#0A5F7A',
        fontWeight: '600',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0A3D52',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 15,
        color: '#4A7A8C',
        fontWeight: '500',
    },

    searchCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#2C3E50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: '#0A5F7A',
    },
    searchInput: {
        fontSize: 15,
        color: '#0A3D52',
        fontWeight: '500',
        paddingLeft: 8,
    },

    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20,
        marginBottom: 25,
        flexDirection: 'row',
        justifyContent: 'space-around',
        elevation: 4,
        shadowColor: '#2C3E50',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: '#D7E5ED',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0A5F7A',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 13,
        color: '#4A7A8C',
        fontWeight: '600',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E1E8ED',
    },

    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '700',
        marginBottom: 16,
        color: '#0A3D52',
    },

    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 15,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#94a3b8',
    },

    patientCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#2C3E50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#D7E5ED',
        overflow: 'hidden',
        position: 'relative',
    },
    patientAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: '#0A5F7A',
    },
    patientContent: {
        paddingLeft: 8,
    },
    patientHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    patientIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    patientIcon: {
        fontSize: 24,
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0A3D52',
        marginBottom: 3,
    },
    patientMeta: {
        fontSize: 13,
        color: '#0A5F7A',
        fontWeight: '600',
        marginBottom: 2,
    },
    patientDate: {
        fontSize: 12,
        color: '#4A7A8C',
    },
    viewBtn: {
        backgroundColor: '#E0F2F7',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    viewBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0A5F7A',
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
        padding: 20,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0A3D52',
        marginBottom: 5,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#0A5F7A',
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '700',
    },
    patientInfoCard: {
        backgroundColor: '#F0F4F8',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#D7E5ED',
    },
    patientInfoText: {
        fontSize: 14,
        color: '#0A3D52',
        marginBottom: 5,
        fontWeight: '500',
    },
    documentCard: {
        backgroundColor: '#E0F2F7',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#1E88E5',
    },
    documentName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0A3D52',
    },
    documentDate: {
        fontSize: 12,
        color: '#4A7A8C',
        marginTop: 4,
    },
    historyCard: {
        backgroundColor: '#FEF3C7',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    historyDate: {
        fontSize: 13,
        fontWeight: '700',
        color: '#92400e',
    },
    historyDoctor: {
        fontSize: 12,
        color: '#78350f',
        marginTop: 2,
    },
    historyProblem: {
        fontSize: 12,
        color: '#451a03',
        marginTop: 4,
        fontWeight: '600',
    },
    historyDetail: {
        fontSize: 12,
        color: '#451a03',
        marginTop: 4,
    },
    closeBtn: {
        backgroundColor: '#0A5F7A',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    closeBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },

    // Patient profile sections
    profileSection: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    profileSectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0A5F7A',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        flex: 1,
    },
    infoValue: {
        fontSize: 13,
        color: '#1e293b',
        fontWeight: '500',
        flex: 2,
        textAlign: 'right',
    },
});
