import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  useHousehold,
  HouseholdMember,
  HouseholdInvite,
} from "@/contexts/HouseholdContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function HouseholdMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [isInviting, setIsInviting] = useState(false);

  const {
    households,
    members,
    invites,
    isLoading,
    loadMembers,
    loadInvites,
    inviteMember,
    removeMember,
    updateMemberRole,
    cancelInvite,
  } = useHousehold();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const household = households.find((h) => h.id === id);
  const isAdmin = household?.role === "ADMIN";

  useEffect(() => {
    if (id) {
      loadMembers(id);
      loadInvites(id);
    }
  }, [id, loadMembers, loadInvites]);

  const handleRefresh = () => {
    if (id) {
      loadMembers(id);
      loadInvites(id);
    }
  };

  const handleInviteMember = async () => {
    if (!id || !inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsInviting(true);

    try {
      const result = await inviteMember(id, inviteEmail.trim(), inviteRole);

      if (result.success) {
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteRole("MEMBER");
        Alert.alert("Success", "Invitation sent successfully!");
      } else {
        Alert.alert("Error", result.error || "Failed to send invitation");
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = (member: HouseholdMember) => {
    if (!id) return;

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.user.name || member.user.email} from this household?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMember(id, member.id),
        },
      ]
    );
  };

  const handleUpdateRole = (member: HouseholdMember) => {
    if (!id) return;

    const newRole = member.role === "ADMIN" ? "MEMBER" : "ADMIN";
    const roleText = newRole === "ADMIN" ? "administrator" : "member";

    Alert.alert(
      "Change Role",
      `Make ${member.user.name || member.user.email} a household ${roleText}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          onPress: () => updateMemberRole(id, member.id, newRole),
        },
      ]
    );
  };

  const handleCancelInvite = (invite: HouseholdInvite) => {
    if (!id) return;

    Alert.alert(
      "Cancel Invitation",
      `Cancel the invitation sent to ${invite.email}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Invitation",
          style: "destructive",
          onPress: () => cancelInvite(id, invite.id),
        },
      ]
    );
  };

  if (!household) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="title">Members</ThemedText>
        </ThemedView>

        <ThemedView style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.tint} />
          <ThemedText style={styles.errorText}>Household not found</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="title">Members</ThemedText>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowInviteModal(true)}
          >
            <Ionicons name="person-add" size={24} color={colors.tint} />
          </TouchableOpacity>
        )}
      </ThemedView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Current Members */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Members ({members.length})
          </ThemedText>

          {members.map((member) => (
            <ThemedView
              key={member.id}
              style={[styles.memberCard, { borderColor: colors.border }]}
            >
              <ThemedView style={styles.memberInfo}>
                <ThemedView style={styles.memberHeader}>
                  <ThemedText style={styles.memberName}>
                    {member.user.name || "Unknown User"}
                  </ThemedText>
                  <ThemedView style={styles.memberBadges}>
                    {member.user.id === user?.id && (
                      <ThemedView
                        style={[styles.badge, { backgroundColor: colors.tint }]}
                      >
                        <ThemedText style={styles.badgeText}>You</ThemedText>
                      </ThemedView>
                    )}
                    <ThemedView
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            member.role === "ADMIN"
                              ? "#FF9500"
                              : colors.tabIconDefault,
                        },
                      ]}
                    >
                      <ThemedText style={styles.badgeText}>
                        {member.role === "ADMIN" ? "Admin" : "Member"}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                </ThemedView>

                <ThemedText style={styles.memberEmail}>
                  {member.user.email}
                </ThemedText>

                <ThemedText style={styles.memberJoined}>
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </ThemedText>
              </ThemedView>

              {isAdmin && member.user.id !== user?.id && (
                <ThemedView style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleUpdateRole(member)}
                  >
                    <Ionicons
                      name={
                        member.role === "ADMIN"
                          ? "remove-circle-outline"
                          : "shield-outline"
                      }
                      size={20}
                      color={colors.tint}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleRemoveMember(member)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </ThemedView>
              )}
            </ThemedView>
          ))}
        </ThemedView>

        {/* Pending Invitations */}
        {invites.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Pending Invitations ({invites.length})
            </ThemedText>

            {invites.map((invite) => (
              <ThemedView
                key={invite.id}
                style={[styles.inviteCard, { borderColor: colors.border }]}
              >
                <ThemedView style={styles.inviteInfo}>
                  <ThemedText style={styles.inviteEmail}>
                    {invite.email}
                  </ThemedText>

                  <ThemedView style={styles.inviteDetails}>
                    <ThemedView
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            invite.role === "ADMIN"
                              ? "#FF9500"
                              : colors.tabIconDefault,
                        },
                      ]}
                    >
                      <ThemedText style={styles.badgeText}>
                        {invite.role === "ADMIN" ? "Admin" : "Member"}
                      </ThemedText>
                    </ThemedView>

                    <ThemedText style={styles.inviteDate}>
                      Sent {new Date(invite.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </ThemedView>

                  <ThemedText style={styles.inviteExpiry}>
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </ThemedText>
                </ThemedView>

                {isAdmin && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCancelInvite(invite)}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={20}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ThemedView style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowInviteModal(false)}
            >
              <ThemedText style={styles.modalCloseText}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText type="title">Invite Member</ThemedText>
            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                { opacity: inviteEmail.trim() ? 1 : 0.5 },
              ]}
              onPress={handleInviteMember}
              disabled={!inviteEmail.trim() || isInviting}
            >
              <ThemedText
                style={[styles.modalSaveText, { color: colors.tint }]}
              >
                {isInviting ? "Sending..." : "Send"}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <ScrollView style={styles.modalContent}>
            <ThemedView style={styles.modalField}>
              <ThemedText style={styles.modalLabel}>Email Address</ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="Enter email address"
                placeholderTextColor={colors.tabIconDefault}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </ThemedView>

            <ThemedView style={styles.modalField}>
              <ThemedText style={styles.modalLabel}>Role</ThemedText>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      inviteRole === "MEMBER"
                        ? colors.tint + "20"
                        : "transparent",
                  },
                ]}
                onPress={() => setInviteRole("MEMBER")}
              >
                <ThemedView style={styles.roleOptionContent}>
                  <Ionicons
                    name={
                      inviteRole === "MEMBER"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={colors.tint}
                  />
                  <ThemedView style={styles.roleOptionText}>
                    <ThemedText style={styles.roleOptionTitle}>
                      Member
                    </ThemedText>
                    <ThemedText style={styles.roleOptionDescription}>
                      Can view and edit household data
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      inviteRole === "ADMIN"
                        ? colors.tint + "20"
                        : "transparent",
                  },
                ]}
                onPress={() => setInviteRole("ADMIN")}
              >
                <ThemedView style={styles.roleOptionContent}>
                  <Ionicons
                    name={
                      inviteRole === "ADMIN"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={colors.tint}
                  />
                  <ThemedView style={styles.roleOptionText}>
                    <ThemedText style={styles.roleOptionTitle}>
                      Administrator
                    </ThemedText>
                    <ThemedText style={styles.roleOptionDescription}>
                      Can manage household settings and members
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              </TouchableOpacity>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  memberBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  memberEmail: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  memberJoined: {
    fontSize: 12,
    opacity: 0.5,
  },
  memberActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteEmail: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  inviteDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  inviteDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  inviteExpiry: {
    fontSize: 12,
    opacity: 0.5,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: "#FF3B30",
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalField: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  roleOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  roleOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  roleOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  roleOptionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  roleOptionDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
});
