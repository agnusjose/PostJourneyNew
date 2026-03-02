import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';

export default function ReviewModal({ visible, onClose, doctorId, patientId, consultationId, doctorName }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert("Rating Required", "Please select a star rating.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post("http://10.63.72.99:5000/api/reviews/submit", {
                patientId,
                doctorId,
                consultationId,
                rating,
                comment
            });

            if (response.data.success) {
                Alert.alert("Thank You", "Your feedback has been submitted!");
                onClose(true);
            } else {
                Alert.alert("Error", response.data.message);
            }
        } catch (error) {
            console.error("Review submit error:", error);
            Alert.alert("Error", "Failed to submit review.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Session Finished!</Text>
                    <Text style={styles.subTitle}>How was your session with {doctorName}?</Text>

                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((s) => (
                            <TouchableOpacity key={s} onPress={() => setRating(s)}>
                                <Text style={[styles.star, rating >= s && styles.selectedStar]}>★</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Optional comment..."
                        multiline
                        value={comment}
                        onChangeText={setComment}
                    />

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Review</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipBtn} onPress={() => onClose(false)}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
    subTitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 20 },
    starsContainer: { flexDirection: 'row', marginBottom: 20 },
    star: { fontSize: 40, color: '#cbd5e1', marginHorizontal: 5 },
    selectedStar: { color: '#eab308' },
    input: { width: '100%', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 12, height: 80, textAlignVertical: 'top', marginBottom: 20 },
    submitBtn: { backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, width: '100%', alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    skipBtn: { marginTop: 15 },
    skipText: { color: '#94a3b8' }
});