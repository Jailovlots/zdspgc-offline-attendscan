import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Calendar, GraduationCap, BookOpen, Hash, Edit2, Save, X, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { getSession, setSession, updateStudent, getStudentProfile, StudentUser } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

interface StudentInfo extends StudentUser {
  middleName: string;
  suffix: string;
  phone: string;
  birthday: string;
  gender: "Male" | "Female";
  address: string;
  city: string;
  province: string;
  zipCode: string;
  semester: string;
  schoolYear: string;
  enrollmentStatus: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
}

const StudentProfile = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<StudentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "student") {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const fullProfile = await getStudentProfile(session.studentId);
        if (fullProfile) {
          const profile: StudentInfo = {
            ...fullProfile,
            middleName: fullProfile.middleName || "",
            suffix: fullProfile.suffix || "",
            phone: fullProfile.phone || "",
            birthday: fullProfile.birthday || "",
            gender: fullProfile.gender || "Male",
            address: fullProfile.address || "",
            city: fullProfile.city || "",
            province: fullProfile.province || "",
            zipCode: fullProfile.zipCode || "",
            semester: fullProfile.semester || "2nd Semester",
            schoolYear: fullProfile.schoolYear || "2024-2025",
            enrollmentStatus: fullProfile.enrollmentStatus || "Regular",
            guardianName: fullProfile.guardianName || "",
            guardianPhone: fullProfile.guardianPhone || "",
            guardianRelation: fullProfile.guardianRelation || "",
          } as StudentInfo;
          setStudent(profile);
          setEditData(profile);
        }
      } catch (err) {
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, [navigate]);

  if (isLoading || !student || !editData) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData({ ...student });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      const success = await updateStudent(editData.studentId, editData);
      if (success) {
        setStudent({ ...editData });
        // Update session so name/course displays correctly in sidebar/header
        setSession(editData);
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to save profile changes");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof StudentInfo, value: any) => {
    setEditData((prev) => prev ? ({ ...prev, [field]: value }) : null);
  };

  const InfoField = ({ label, value, icon: Icon, field, editable = true }: {
    label: string;
    value: string;
    icon?: React.ElementType;
    field?: keyof StudentInfo;
    editable?: boolean;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </Label>
      {isEditing && editable && field ? (
        <Input
          value={editData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          className="h-9 text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      )}
    </div>
  );

  return (
    <DashboardLayout role="student">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">View and manage your personal information</p>
          </div>
          {!isEditing ? (
            <Button onClick={handleEdit} className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-gold text-gold-foreground hover:bg-gold/90">
                {isSaving ? "Saving..." : <><Save className="h-4 w-4 mr-1" /> Save</>}
              </Button>
            </div>
          )}
        </div>

        {/* Profile Header Card */}
        <Card className="shadow-card overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
          <CardContent className="relative pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gold text-gold-foreground text-2xl font-bold">
                    {student.firstName[0]}{student.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-gold text-gold-foreground flex items-center justify-center shadow-md">
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex-1 pt-2 sm:pt-0">
                <h2 className="text-xl font-bold text-foreground">
                  {student.firstName} {student.middleName ? student.middleName[0] + "." : ""} {student.lastName} {student.suffix}
                </h2>
                <p className="text-sm text-muted-foreground font-mono">{student.studentId}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-gold/10 text-gold border-gold/30 hover:bg-gold/20">{student.course}</Badge>
                  <Badge variant="outline">{student.section}</Badge>
                  <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                    {student.enrollmentStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-sans flex items-center gap-2">
                <User className="h-4 w-4 text-gold" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="First Name" value={student.firstName} field="firstName" />
                <InfoField label="Last Name" value={student.lastName} field="lastName" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Middle Name" value={student.middleName} field="middleName" />
                <InfoField label="Suffix" value={student.suffix} field="suffix" />
              </div>
              <InfoField label="Gender" value={student.gender} field="gender" />
              <InfoField label="Birthday" value={student.birthday} icon={Calendar} field="birthday" />
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-sans flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoField label="Email Address" value={student.email} icon={Mail} field="email" />
              <InfoField label="Phone Number" value={student.phone} icon={Phone} field="phone" />
              <Separator />
              <InfoField label="Street Address" value={student.address} icon={MapPin} field="address" />
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="City" value={student.city} field="city" />
                <InfoField label="Province" value={student.province} field="province" />
              </div>
              <InfoField label="Zip Code" value={student.zipCode} field="zipCode" />
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-sans flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-gold" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoField label="Student ID" value={student.studentId} icon={Hash} field="studentId" editable={false} />
              <InfoField label="Course" value={student.course} icon={BookOpen} field="course" editable={false} />
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Year Level" value={student.yearLevel} field="yearLevel" editable={false} />
                <InfoField label="Section" value={student.section} field="section" editable={false} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Semester" value={student.semester} field="semester" editable={false} />
                <InfoField label="School Year" value={student.schoolYear} field="schoolYear" editable={false} />
              </div>
              <InfoField label="Enrollment Status" value={student.enrollmentStatus} field="enrollmentStatus" editable={false} />
            </CardContent>
          </Card>

          {/* Guardian Information */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-sans flex items-center gap-2">
                <User className="h-4 w-4 text-gold" />
                Guardian / Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoField label="Guardian Name" value={student.guardianName} field="guardianName" />
              <InfoField label="Relationship" value={student.guardianRelation} field="guardianRelation" />
              <InfoField label="Contact Number" value={student.guardianPhone} icon={Phone} field="guardianPhone" />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
