import { Metadata } from 'next';
import { Header } from '@/components';

export const metadata: Metadata = {
    title: "개인정보처리방침",
    description: "밥모아 서비스의 개인정보처리방침입니다. 수집 항목, 이용 목적, 보관 기간 등을 안내합니다.",
    alternates: {
        canonical: "https://babmoa-vote.vercel.app/privacy",
    },
};

export default function PrivacyPage() {
    return (
        <>
            <Header />
            <main className="max-w-lg mx-auto px-5 py-12">
                <h1 className="text-2xl font-bold mb-6">개인정보처리방침</h1>
                <div className="prose prose-sm text-gray-700 space-y-6">
                    <section>
                        <p>
                            밥모아(이하 “회사”)는 개인정보 보호법 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위하여 다음과 같은 개인정보처리방침을 수립·공개합니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">개인정보의 수집 항목 및 방법</h3>
                        <p>회사는 서비스 제공을 위해 아래와 같은 개인정보를 수집할 수 있습니다.</p>
                        <div className="mt-2 pl-2 border-l-2 border-gray-100">
                            <h4 className="font-semibold text-gray-900 mb-1">수집 항목</h4>
                            <ul className="list-disc pl-5 mb-2">
                                <li>IP 주소</li>
                                <li>접속 로그</li>
                                <li>쿠키 및 기기 정보</li>
                                <li>이용자가 입력한 투표 및 주차 관련 기록</li>
                            </ul>
                            <h4 className="font-semibold text-gray-900 mb-1">수집 방법</h4>
                            <ul className="list-disc pl-5">
                                <li>서비스 이용 과정에서 자동으로 수집</li>
                                <li>이용자가 직접 입력한 정보</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">개인정보의 수집 및 이용 목적</h3>
                        <p>회사는 수집한 개인정보를 다음 목적을 위해 이용합니다.</p>
                        <ul className="list-disc pl-5 mt-2">
                            <li>서비스 제공 및 운영</li>
                            <li>투표 및 주차 정보 통계 산출</li>
                            <li>서비스 품질 개선 및 기능 고도화</li>
                            <li>비정상적인 이용 행위 방지</li>
                            <li>서비스 이용 분석 및 오류 대응</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">개인정보의 보유 및 이용 기간</h3>
                        <p>
                            회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
                        </p>
                        <p className="mt-2">단, 다음의 경우에는 일정 기간 보관할 수 있습니다.</p>
                        <ul className="list-disc pl-5 mt-2">
                            <li>서비스 운영 및 통계 분석을 위한 비식별 데이터</li>
                            <li>관련 법령에 따라 보관이 필요한 정보</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">개인정보의 제3자 제공</h3>
                        <p>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.</p>
                        <p className="mt-2">다만, 다음의 경우에는 예외로 합니다.</p>
                        <ul className="list-disc pl-5 mt-2">
                            <li>이용자가 사전에 동의한 경우</li>
                            <li>법령에 따라 제공이 요구되는 경우</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">개인정보 처리의 위탁</h3>
                        <p>회사는 원활한 서비스 제공을 위해 아래와 같은 외부 서비스를 이용할 수 있습니다.</p>
                        <ul className="list-disc pl-5 mt-2">
                            <li>지도 및 장소 검색 제공을 위한 외부 API 서비스</li>
                            <li>서버 호스팅 및 데이터 저장 서비스</li>
                        </ul>
                        <p className="mt-2">
                            이 경우 회사는 개인정보 보호 관련 법령을 준수하며, 개인정보가 안전하게 처리되도록 관리·감독합니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">개인정보의 파기 절차 및 방법</h3>
                        <p>개인정보는 수집 목적 달성 후 지체 없이 파기됩니다.</p>
                        <ul className="list-disc pl-5 mt-2">
                            <li>전자적 파일 형태의 정보는 복구할 수 없는 방법으로 삭제하며,</li>
                            <li>종이 문서 형태의 정보는 분쇄 또는 소각을 통해 파기합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">이용자의 권리</h3>
                        <p>
                            이용자는 관련 법령에 따라 자신의 개인정보에 대해 열람, 정정, 삭제를 요청할 수 있습니다.
                        </p>
                        <p className="mt-2">
                            다만, 서비스 특성상 개인 식별이 불가능한 데이터에 대해서는 일부 권리가 제한될 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">개인정보 보호를 위한 조치</h3>
                        <p>회사는 개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                        <ul className="list-disc pl-5 mt-2">
                            <li>개인정보 접근 권한 최소화</li>
                            <li>비식별 처리된 데이터 활용</li>
                            <li>보안 설정 및 접근 통제 관리</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">개인정보처리방침의 변경</h3>
                        <p>본 개인정보처리방침은 법령 또는 서비스 변경에 따라 수정될 수 있습니다.</p>
                        <p className="mt-2">
                            변경 사항은 서비스 내 공지사항을 통해 안내합니다.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold mb-2">문의처</h3>
                        <p>
                            문의처
                            개인정보와 관련된 문의 사항은 아래 이메일을 통해 접수할 수 있습니다.
                            이메일: thiagooo@naver.com
                        </p>
                    </section>
                </div>
            </main>
        </>
    );
}
