import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    ImageBackground,
    Platform,
    Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';

const BASE_URL = "http://172.16.230.150:5000";

export default function PatientDocuments({ route, navigation, embedded = false }) {
    const { userId, userName } = route.params;
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/patient/${userId}/documents`);
            if (response.data.success) {
                setDocuments(response.data.documents);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const openDocument = (fileUrl) => {
        const fullUrl = `${BASE_URL}${fileUrl}`;
        console.log("Opening document:", fullUrl);
        Linking.openURL(fullUrl).catch(() => {
            Alert.alert("Error", "Cannot open document. Make sure you have a browser or PDF viewer installed.");
        });
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (result.type === 'success' || !result.canceled) {
                const file = result.assets ? result.assets[0] : result;
                uploadDocument(file);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const uploadDocument = async (file) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('document', {
                uri: file.uri,
                type: file.mimeType || 'application/pdf',
                name: file.name,
            });
            formData.append('patientId', userId);
            formData.append('documentType', 'other');
            formData.append('notes', '');

            const response = await axios.post(
                `${BASE_URL}/api/patient/documents/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (response.data.success) {
                Alert.alert("Success", "Document uploaded successfully");
                fetchDocuments();
            } else {
                Alert.alert("Error", response.data.message || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error);
            Alert.alert("Error", "Failed to upload document");
        } finally {
            setUploading(false);
        }
    };

    const deleteDocument = async (docId) => {
        Alert.alert(
            "Delete Document",
            "Are you sure you want to delete this document?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await axios.delete(`${BASE_URL}/api/patient/documents/${docId}`);
                            if (response.data.success) {
                                Alert.alert("Success", "Document deleted");
                                fetchDocuments();
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete document");
                        }
                    }
                }
            ]
        );
    };

    const renderContent = () => (
        <ScrollView contentContainerStyle={[styles.container, embedded && { paddingTop: 15 }]}>
            {!embedded && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>My Medical Documents</Text>
                    <Text style={styles.subtitle}>Upload and manage your medical records</Text>
                </View>
            )}

            <TouchableOpacity
                style={styles.uploadCard}
                onPress={pickDocument}
                disabled={uploading}
            >
                <View style={styles.accentBar} />
                <View style={styles.uploadContent}>
                    <Text style={styles.uploadIcon}>📤</Text>
                    <Text style={styles.uploadTitle}>
                        {uploading ? "Uploading..." : "Upload New Document"}
                    </Text>
                    <Text style={styles.uploadSubtitle}>
                        PDF, JPEG, or PNG files (Max 10MB)
                    </Text>
                    {uploading && <ActivityIndicator size="small" color="#1E88E5" style={{ marginTop: 10 }} />}
                </View>
            </TouchableOpacity>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Documents ({documents.length})</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 20 }} />
                ) : documents.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📄</Text>
                        <Text style={styles.emptyText}>No documents uploaded yet</Text>
                        <Text style={styles.emptySubtext}>
                            Upload your medical records, prescriptions, or test results
                        </Text>
                    </View>
                ) : (
                    documents.map((doc) => (
                        <View key={doc._id} style={styles.documentCard}>
                            <View style={styles.documentAccent} />
                            <View style={styles.documentContent}>
                                <View style={styles.documentHeader}>
                                    <View style={styles.documentIconCircle}>
                                        <Text style={styles.documentIcon}>
                                            {doc.fileType === 'pdf' ? '📄' : '🖼️'}
                                        </Text>
                                    </View>
                                    <View style={styles.documentInfo}>
                                        <Text style={styles.documentName}>{doc.fileName}</Text>
                                        <Text style={styles.documentDate}>
                                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardActions}>
                                    <TouchableOpacity
                                        style={styles.viewBtn}
                                        onPress={() => openDocument(doc.fileUrl)}
                                    >
                                        <Text style={styles.viewBtnText}>👁️ View</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => deleteDocument(doc._id)}
                                    >
                                        <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </View>
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

    uploadCard: {
        backgroundColor: '#fff',
        borderRadius: 22,
        padding: 25,
        marginBottom: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 15,
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
    uploadContent: {
        alignItems: 'center',
    },
    uploadIcon: {
        fontSize: 48,
        marginBottom: 10,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0A3D52',
        marginBottom: 5,
    },
    uploadSubtitle: {
        fontSize: 13,
        color: '#4A7A8C',
        textAlign: 'center',
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
        fontSize: 16,
        fontWeight: '700',
        color: '#4A7A8C',
        marginBottom: 5,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        paddingHorizontal: 30,
    },

    documentCard: {
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
    documentAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: '#0A5F7A',
    },
    documentContent: {
        paddingLeft: 8,
    },
    documentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    documentIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E0F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    documentIcon: {
        fontSize: 24,
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0A3D52',
        marginBottom: 3,
    },
    documentDate: {
        fontSize: 12,
        color: '#4A7A8C',
    },
    deleteBtn: {
        backgroundColor: '#FEE2E2',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    deleteBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#DC2626',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
    },
    viewBtn: {
        backgroundColor: '#E0F2FE',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    viewBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0284C7',
    },
});
